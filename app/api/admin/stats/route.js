import { NextResponse } from "next/server";
import { getGlobalStats } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const s = await getGlobalStats();
  const stats = {
    totalUsers: s.total_users,
    totalScans: s.total_scans,
    urlScans: s.url_scans,
    emailScans: s.email_scans,
    highRisk: s.high_risk,
    mediumRisk: s.medium_risk,
    lowRisk: s.low_risk,
  };

  return NextResponse.json({ stats });
}
