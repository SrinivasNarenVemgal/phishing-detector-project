import { NextResponse } from "next/server";
import { createReport, getReportsByUser, getScanById } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const reports = await getReportsByUser(sessionUser.id);
  return NextResponse.json({ reports });
}

export async function POST(request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { scanId } = await request.json();
  const scan = await getScanById(scanId);
  if (!scan || scan.userId !== sessionUser.id) {
    return NextResponse.json({ error: "Scan not found." }, { status: 404 });
  }

  const summary = buildSummary(scan);
  const report = await createReport({
    userId: sessionUser.id,
    scanId: scan.id,
    reportType: scan.scanType,
    riskLevel: scan.riskLevel,
    riskScore: scan.riskScore,
    summary,
    details: {
      content: scan.content,
      result: scan.result,
      reasons: scan.reasons,
      domainAge: scan.domainAge || null,
      scannedAt: scan.createdAt,
    },
  });

  return NextResponse.json({
    report: {
      id: report.id,
      userId: sessionUser.id,
      scanId: scan.id,
      reportType: scan.scanType,
      riskLevel: scan.riskLevel,
      riskScore: scan.riskScore,
      summary,
      createdAt: report.created_at,
    },
  });
}

function buildSummary(scan) {
  const target = scan.scanType === "url" ? scan.content : scan.content.slice(0, 60) + (scan.content.length > 60 ? "…" : "");
  const reasonCount = (scan.reasons || []).length;
  return `${scan.scanType === "url" ? "URL" : "Email"} scan of "${target}" was classified ${scan.riskLevel} risk (${scan.riskScore}/100) based on ${reasonCount} detected signal(s).`;
}
