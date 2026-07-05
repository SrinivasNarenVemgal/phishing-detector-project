import { NextResponse } from "next/server";
import { getAllReportsWithUser } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const reports = await getAllReportsWithUser();
  return NextResponse.json({ reports });
}
