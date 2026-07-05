import { NextResponse } from "next/server";
import { createUser, getUserByEmail, countUsers } from "@/lib/store";
import { hashPassword, signToken, COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000); // 5 accounts per hour per IP
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many registration attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const { name, email, password } = await request.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase();
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const isFirstUser = (await countUsers()) === 0;
  const role = isFirstUser ? "admin" : "user"; // first registered user becomes admin

  const user = await createUser({ name, email: normalizedEmail, passwordHash, role });

  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
  const res = NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  res.cookies.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}
