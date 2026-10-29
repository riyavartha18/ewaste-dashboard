import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyJWT, AUTH_COOKIE_NAME } from "@/lib/jwt";

export const dynamic = "force-dynamic";

// GET /api/auth/session
// Reads the JWT from either:
//   1. The Authorization: Bearer <token> header (set by the client from localStorage)
//   2. The auth cookie (set by /api/auth/login)
//
// Returns { user: { id, email, name } } if valid, or {} if not.
export async function GET(req: NextRequest) {
  let token: string | undefined;

  // 1. Authorization header
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice("Bearer ".length).trim();
  }

  // 2. Cookie fallback
  if (!token) {
    token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  }

  if (!token) {
    return NextResponse.json({});
  }

  const payload = verifyJWT(token);
  if (!payload) {
    return NextResponse.json({});
  }

  // Confirm the user still exists in the DB (so disabled/deleted users
  // are not allowed even if their JWT is still valid).
  const user = await db.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user || user.role !== "owner") {
    return NextResponse.json({});
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    expires: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
  });
}
