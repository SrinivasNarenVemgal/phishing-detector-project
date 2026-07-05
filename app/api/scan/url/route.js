import { NextResponse } from "next/server";
import { createScan, getCustomKeywords } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";
import { analyzeUrlWithModel } from "@/lib/ensemble";
import { getDomainAge, applyDomainAge } from "@/lib/domainAge";
import { checkVirusTotal, applyVirusTotal } from "@/lib/virustotal";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const limit = checkRateLimit(`scan:${sessionUser.id}`, 15, 60 * 1000); // 15 scans per minute per user
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Scan limit reached. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const { url } = await request.json();
  if (!url || !url.trim()) {
    return NextResponse.json({ error: "URL is required." }, { status: 400 });
  }

  const trimmedUrl = url.trim();
  const customKeywords = await getCustomKeywords();
  const combinedResult = analyzeUrlWithModel(trimmedUrl, customKeywords);

  let hostname = "";
  try {
    const withProtocol = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `http://${trimmedUrl}`;
    hostname = new URL(withProtocol).hostname;
  } catch {
    // malformed URL already flagged by the rule engine; skip domain-age lookup
  }

  const domainAge = hostname ? await getDomainAge(hostname) : null;
  const withDomainAge = hostname ? applyDomainAge(combinedResult, domainAge) : combinedResult;

  const vt = await checkVirusTotal(trimmedUrl);
  const result = applyVirusTotal(withDomainAge, vt);

  const scan = await createScan({
    userId: sessionUser.id,
    scanType: "url",
    content: trimmedUrl,
    result: result.status,
    riskLevel: result.riskLevel,
    riskScore: result.riskScore,
    reasons: result.reasons,
    domainAge: result.domainAge || null,
    virusTotal: result.virusTotal || null,
  });

  return NextResponse.json({ ...result, scanId: scan.id });
}
