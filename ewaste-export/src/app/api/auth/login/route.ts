import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { signJWT, AUTH_COOKIE_NAME } from "@/lib/jwt";

export const dynamic = "force-dynamic";

// POST /api/auth/login
// Body: { email, password }
// Returns: { user: { id, email, name }, token: <jwt> }
//
// We set the JWT as an httpOnly cookie AND return it in the response body
// so the client can store it in localStorage. The localStorage copy is the
// fallback for cases where cookies are blocked (e.g., sandboxed iframes in
// chat preview environments). Both transport paths use the same JWT.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (user.role !== "owner") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const token = signJWT({ id: user.id, email: user.email });
  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    token,
  });
  // Set as cookie too (works when not in a sandboxed iframe).
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}
