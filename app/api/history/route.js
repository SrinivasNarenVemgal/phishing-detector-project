import { NextResponse } from "next/server";
import { getScansByUser, getScanStatsByUser } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const scans = await getScansByUser(sessionUser.id);
  const stats = await getScanStatsByUser(sessionUser.id);

  return NextResponse.json({ scans, stats });
}
