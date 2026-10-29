import { createHmac, timingSafeEqual } from "crypto";

// Lightweight JWT implementation using HMAC-SHA256.
// No external dependencies — Node's built-in crypto module is enough.
//
// Token format: <base64url(header)>.<base64url(payload)>.<base64url(sig)>
// Header: {"alg":"HS256","typ":"JWT"}

const SECRET = process.env.NEXTAUTH_SECRET || "dev-only-insecure-secret-change-me";

function base64urlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

export interface JWTPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

export function signJWT(payload: Omit<JWTPayload, "iat" | "exp">, ttlSeconds = 60 * 60 * 24 * 30): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const encHeader = base64urlEncode(JSON.stringify(header));
  const encPayload = base64urlEncode(JSON.stringify(fullPayload));
  const data = `${encHeader}.${encPayload}`;
  const sig = createHmac("sha256", SECRET).update(data).digest();
  return `${data}.${base64urlEncode(sig)}`;
}

export function verifyJWT(token: string): JWTPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encHeader, encPayload, encSig] = parts;
  const data = `${encHeader}.${encPayload}`;
  const expectedSig = createHmac("sha256", SECRET).update(data).digest();
  let actualSig: Buffer;
  try {
    actualSig = base64urlDecode(encSig);
  } catch {
    return null;
  }
  if (expectedSig.length !== actualSig.length) return null;
  if (!timingSafeEqual(expectedSig, actualSig)) return null;

  let payload: JWTPayload;
  try {
    payload = JSON.parse(base64urlDecode(encPayload).toString("utf8"));
  } catch {
    return null;
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

export const AUTH_COOKIE_NAME = "ewaste-auth-token";
