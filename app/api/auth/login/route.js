import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/store";
import { verifyPassword, signToken, COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`login:${ip}`, 5, 60 * 1000); // 5 attempts per minute
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await getUserByEmail(email.toLowerCase());
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
  const res = NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  res.cookies.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}
