import { NextResponse } from "next/server";
import { getAllUsersWithScanCounts, updateUserRole } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const rows = await getAllUsersWithScanCounts();
  const users = rows.map((u) => ({
    id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.created_at, scanCount: u.scan_count,
  }));

  return NextResponse.json({ users });
}

export async function PATCH(request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { userId, role } = await request.json();
  await updateUserRole(userId, role === "admin" ? "admin" : "user");
  return NextResponse.json({ ok: true });
}
