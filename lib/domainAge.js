// Looks up how old a domain is using RDAP (Registration Data Access Protocol),
// the modern, free, HTTP-based replacement for old-style WHOIS.
// No API key required. Docs: https://rdap.org

const RDAP_TIMEOUT_MS = 4000;

/**
 * Returns { ageDays, registeredOn, status } or null if lookup fails
 * (private registration, unsupported TLD, network issue, etc).
 * A null result is NOT treated as suspicious — many legitimate domains
 * use privacy protection that hides the creation date.
 */
export async function getDomainAge(hostname) {
  // Strip to the registrable domain (drop subdomains like "login.example.com" -> "example.com")
  const parts = hostname.split(".");
  const registrableDomain = parts.length > 2 ? parts.slice(-2).join(".") : hostname;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RDAP_TIMEOUT_MS);

  try {
    const res = await fetch(`https://rdap.org/domain/${registrableDomain}`, {
      signal: controller.signal,
      headers: { Accept: "application/rdap+json" },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    const registrationEvent = (data.events || []).find(
      (e) => e.eventAction === "registration"
    );
    if (!registrationEvent?.eventDate) return null;

    const registeredOn = new Date(registrationEvent.eventDate);
    const ageDays = Math.floor((Date.now() - registeredOn.getTime()) / (1000 * 60 * 60 * 24));

    return {
      ageDays,
      registeredOn: registeredOn.toISOString().slice(0, 10),
      status: data.status || [],
    };
  } catch {
    clearTimeout(timeout);
    return null; // lookup failed — fall back to text-only analysis, don't penalize
  }
}

/**
 * Merges a domain-age result into an existing analyzeUrl() result:
 * - very new domains (<30 days) are a strong phishing signal -> big score bump
 * - somewhat new domains (<180 days) -> moderate bump
 * - lookup unavailable -> no change, but noted for transparency
 */
export function applyDomainAge(baseResult, domainAge) {
  if (!domainAge) {
    return {
      ...baseResult,
      domainAge: null,
      reasons: [...baseResult.reasons, "Domain age could not be verified (registry lookup unavailable or privacy-protected)."],
    };
  }

  let bonus = 0;
  let reason = null;
  if (domainAge.ageDays < 0) {
    // clock skew or bad data — ignore
  } else if (domainAge.ageDays <= 30) {
    bonus = 35;
    reason = `Domain was registered only ${domainAge.ageDays} day(s) ago — very common for phishing sites.`;
  } else if (domainAge.ageDays <= 180) {
    bonus = 15;
    reason = `Domain is relatively new (registered ${domainAge.ageDays} days ago).`;
  }

  const newScore = Math.min(100, baseResult.riskScore + bonus);
  const reasons = reason ? [...baseResult.reasons, reason] : [
    ...baseResult.reasons,
    `Domain registered on ${domainAge.registeredOn} (${domainAge.ageDays} days ago) — not a strong signal on its own.`,
  ];

  let riskLevel = baseResult.riskLevel;
  let status = baseResult.status;
  let recommendation = baseResult.recommendation;
  if (newScore >= 60) {
    riskLevel = "HIGH";
    status = baseResult.status === "Likely Safe" ? "Suspicious Website" : baseResult.status;
    recommendation = "Avoid visiting this site and do not enter any information.";
  } else if (newScore >= 30) {
    riskLevel = riskLevel === "LOW" ? "MEDIUM" : riskLevel;
    recommendation = riskLevel === "MEDIUM" ? "Proceed with caution — verify the sender/source before entering data." : recommendation;
  }

  return {
    ...baseResult,
    riskScore: newScore,
    riskLevel,
    status,
    recommendation,
    reasons,
    domainAge,
  };
}
