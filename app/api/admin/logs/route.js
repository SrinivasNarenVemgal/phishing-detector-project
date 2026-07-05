import { NextResponse } from "next/server";
import { getAllScansFiltered } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";

export async function GET(request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const scans = await getAllScansFiltered({
    riskLevel: searchParams.get("risk") || undefined,
    scanType: searchParams.get("type") || undefined,
    q: searchParams.get("q") || undefined,
  });

  return NextResponse.json({ scans });
}
