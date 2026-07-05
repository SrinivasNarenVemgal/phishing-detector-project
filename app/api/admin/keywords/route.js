import { NextResponse } from "next/server";
import { getCustomKeywords, addCustomKeyword, removeCustomKeyword } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";
import { DEFAULT_SUSPICIOUS_URL_KEYWORDS } from "@/lib/detection";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const customKeywords = await getCustomKeywords();
  return NextResponse.json({ defaultKeywords: DEFAULT_SUSPICIOUS_URL_KEYWORDS, customKeywords });
}

export async function POST(request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const { keyword } = await request.json();
  const clean = (keyword || "").trim().toLowerCase();
  if (!clean) return NextResponse.json({ error: "Keyword is required." }, { status: 400 });
  if (clean.length > 40) return NextResponse.json({ error: "Keyword too long." }, { status: 400 });

  const existing = await getCustomKeywords();
  if (DEFAULT_SUSPICIOUS_URL_KEYWORDS.includes(clean) || existing.includes(clean)) {
    return NextResponse.json({ error: "Keyword already exists." }, { status: 409 });
  }
  const customKeywords = await addCustomKeyword(clean);
  return NextResponse.json({ customKeywords });
}

export async function DELETE(request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const { keyword } = await request.json();
  const customKeywords = await removeCustomKeyword(keyword);
  return NextResponse.json({ customKeywords });
}
