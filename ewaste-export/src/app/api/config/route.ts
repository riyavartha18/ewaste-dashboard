import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureOwnerExists } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

// GET /api/config
// Reports whether an owner account has been bootstrapped yet. The frontend
// uses this to decide whether to render the OwnerSetup screen.
//
// Side effect: if OWNER_EMAIL + OWNER_PASSWORD are set in the env and no
// owner exists yet, this call auto-creates the owner (idempotent).
export async function GET() {
  await ensureOwnerExists();
  let ownerCount = 0;
  try {
    ownerCount = await db.user.count();
  } catch {
    ownerCount = 0;
  }
  return NextResponse.json({
    configured: true,
    hasOwner: ownerCount > 0,
  });
}
