import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

// POST /api/setup
// One-time bootstrap of the single owner account. Refuses to create a
// second owner if one already exists — guaranteeing that no one else can
// hijack the dashboard once the owner has been bootstrapped.
//
// Body: { email, password, name? }
export async function POST(req: NextRequest) {
  const existing = await db.user.count();
  if (existing > 0) {
    return NextResponse.json(
      { error: "An owner account already exists. Sign in instead." },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const passwordHash = hashPassword(password);
  const user = await db.user.create({
    data: { email, passwordHash, name, role: "owner" },
  });

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
}
