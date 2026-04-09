import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json().catch(() => ({ password: "" }));
  const expected = getAdminPassword();

  if (!expected) {
    return NextResponse.json({ error: "ADMIN_PASSWORD is not configured." }, { status: 500 });
  }

  if (!password || password !== expected) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: expected,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
