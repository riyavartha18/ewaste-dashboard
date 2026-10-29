import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/jwt";

export const dynamic = "force-dynamic";

// POST /api/auth/logout
// Clears the auth cookie. The client also clears localStorage.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
