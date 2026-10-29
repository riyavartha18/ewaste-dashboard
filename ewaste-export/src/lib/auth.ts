import { headers, cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyJWT, AUTH_COOKIE_NAME } from "@/lib/jwt";
import type { Session } from "@/lib/types";

// Read the JWT from either the Authorization header (preferred — works in
// sandboxed iframes where cookies are blocked) or the auth cookie
// (fallback for non-iframe contexts).
//
// Uses Next.js App Router's headers() and cookies() helpers so that this
// works in any route handler or server component without passing `req`.
async function extractToken(): Promise<string | undefined> {
  const h = await headers();
  const authHeader = h.get("authorization") || h.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  const c = await cookies();
  const cookieVal = c.get(AUTH_COOKIE_NAME)?.value;
  if (cookieVal) return cookieVal;
  return undefined;
}

// Returns the current session info, by checking the Authorization header
// or the auth cookie.
export async function getServerSessionInfo(): Promise<Session> {
  let token: string | undefined;
  try {
    token = await extractToken();
  } catch {
    return { user: null };
  }
  if (!token) return { user: null };
  const payload = verifyJWT(token);
  if (!payload) return { user: null };
  const user = await db.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, role: true },
  });
  if (!user || user.role !== "owner") return { user: null };
  return { user: { id: user.id, email: user.email } };
}

// True when the current request belongs to the single owner account.
export async function isOwner(): Promise<boolean> {
  const session = await getServerSessionInfo();
  return Boolean(session.user?.email);
}

export interface OwnerContext {
  ok: true;
  ownerEmail: string;
  ownerId: string;
  db: typeof db;
}

// Returns the owner's email if authenticated as the owner; otherwise null.
// Use this in API routes to gate write operations.
export async function requireOwner(): Promise<
  | OwnerContext
  | { ok: false; status: number; message: string }
> {
  const session = await getServerSessionInfo();
  if (!session.user) {
    return {
      ok: false as const,
      status: 401,
      message: "Unauthorized. Sign in as the owner.",
    };
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true },
  });
  if (!user || user.role !== "owner") {
    return {
      ok: false as const,
      status: 403,
      message: "Forbidden. Only the authorised owner account may perform this action.",
    };
  }
  return { ok: true as const, ownerEmail: user.email, ownerId: user.id, db };
}

export function notOwnerResponse(status = 401, message = "Unauthorized."): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
