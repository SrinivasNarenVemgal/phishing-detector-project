import { NextResponse } from "next/server";
import { createScan, getCustomKeywords } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";
import { analyzeEmail } from "@/lib/detection";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const limit = checkRateLimit(`scan:${sessionUser.id}`, 15, 60 * 1000); // shared bucket with URL scans
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Scan limit reached. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const { content } = await request.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Email content is required." }, { status: 400 });
  }

  const customKeywords = await getCustomKeywords();
  const result = analyzeEmail(content.trim(), customKeywords);

  const scan = await createScan({
    userId: sessionUser.id,
    scanType: "email",
    content: content.trim().slice(0, 2000),
    result: result.status,
    riskLevel: result.riskLevel,
    riskScore: result.riskScore,
    reasons: result.reasons,
  });

  return NextResponse.json({ ...result, scanId: scan.id });
}
