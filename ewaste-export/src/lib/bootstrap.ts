import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

// Auto-bootstrap the single owner account on first server activity if
// OWNER_EMAIL + OWNER_PASSWORD are set in the environment and no owner
// exists yet. Idempotent: once an owner exists, this is a no-op.
//
// The credentials are read server-side only (they are not NEXT_PUBLIC_*
// vars, so they never reach the client bundle). The owner is created with
// a scrypt-hashed password — the plaintext password is never persisted.
//
// A module-level flag prevents repeated DB checks on every config call.

let ensurePromise: Promise<void> | null = null;

export function ensureOwnerExists(): Promise<void> {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    try {
      const count = await db.user.count();
      if (count > 0) return;
      const email = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
      const password = process.env.OWNER_PASSWORD ?? "";
      if (!email || !password) return;
      await db.user.create({
        data: {
          email,
          passwordHash: hashPassword(password),
          role: "owner",
        },
      });
    } catch {
      // ignore — a concurrent request may have created the owner; the
      // next /api/config call will re-check.
    }
  })();
  return ensurePromise;
}
