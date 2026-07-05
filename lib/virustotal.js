// Optional real threat-intel check via VirusTotal's public API v3.
// Entirely optional: if VIRUSTOTAL_API_KEY isn't set, this module returns
// null immediately and the app falls back to the rule engine + ML model only.
// Free tier docs: https://docs.virustotal.com/reference/overview

const VT_TIMEOUT_MS = 5000;

function toUrlId(url) {
  // VirusTotal identifies URLs by base64url(url) with padding stripped.
  return Buffer.from(url).toString("base64url").replace(/=+$/, "");
}

/**
 * Returns { malicious, suspicious, harmless, undetected, totalEngines, verdict }
 * for a URL VirusTotal has already scanned before, or
 * { status: "not_yet_scanned" } if it's new to VT (and submits it in the
 * background for next time), or null if the API key isn't configured or the
 * request fails for any reason (network, rate limit, etc). A null result is
 * never treated as suspicious — it just means this signal is unavailable.
 */
export async function checkVirusTotal(rawUrl) {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) return null;

  const urlId = toUrlId(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VT_TIMEOUT_MS);

  try {
    const res = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
      headers: { "x-apikey": apiKey },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 404) {
      // Unknown to VirusTotal yet — submit it for scanning so it's known next time.
      // Fire-and-forget: we don't block the user's request waiting for analysis.
      submitForScanning(rawUrl, apiKey).catch(() => {});
      return { status: "not_yet_scanned" };
    }

    if (!res.ok) return null;

    const data = await res.json();
    const stats = data?.data?.attributes?.last_analysis_stats;
    if (!stats) return null;

    const totalEngines =
      (stats.malicious || 0) + (stats.suspicious || 0) + (stats.harmless || 0) + (stats.undetected || 0);
    const verdict = stats.malicious > 0 ? "malicious" : stats.suspicious > 0 ? "suspicious" : "clean";

    return {
      malicious: stats.malicious || 0,
      suspicious: stats.suspicious || 0,
      harmless: stats.harmless || 0,
      undetected: stats.undetected || 0,
      totalEngines,
      verdict,
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

async function submitForScanning(url, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VT_TIMEOUT_MS);
  try {
    await fetch("https://www.virustotal.com/api/v3/urls", {
      method: "POST",
      headers: {
        "x-apikey": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ url }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Merges a VirusTotal result into an ensemble result, same pattern as
 * applyDomainAge(): boosts score for real engine detections, notes when
 * VT data isn't available instead of penalizing.
 */
export function applyVirusTotal(baseResult, vt) {
  if (!vt) return baseResult; // not configured / unavailable — no change, no note (keeps output clean when VT isn't set up)

  if (vt.status === "not_yet_scanned") {
    return {
      ...baseResult,
      virusTotal: vt,
      reasons: [...baseResult.reasons, "VirusTotal has not scanned this URL before — submitted for analysis."],
    };
  }

  let bonus = 0;
  let reason = null;
  if (vt.malicious > 0) {
    bonus = Math.min(40, vt.malicious * 8);
    reason = `Flagged as malicious by ${vt.malicious} of ${vt.totalEngines} VirusTotal security engines.`;
  } else if (vt.suspicious > 0) {
    bonus = Math.min(20, vt.suspicious * 5);
    reason = `Flagged as suspicious by ${vt.suspicious} of ${vt.totalEngines} VirusTotal security engines.`;
  } else {
    reason = `No security engines on VirusTotal flagged this URL (0 of ${vt.totalEngines}).`;
  }

  const newScore = Math.min(100, baseResult.riskScore + bonus);
  let riskLevel = baseResult.riskLevel;
  if (newScore >= 60) riskLevel = "HIGH";
  else if (newScore >= 30 && riskLevel === "LOW") riskLevel = "MEDIUM";

  return {
    ...baseResult,
    riskScore: newScore,
    riskLevel,
    reasons: [...baseResult.reasons, reason],
    virusTotal: vt,
  };
}
