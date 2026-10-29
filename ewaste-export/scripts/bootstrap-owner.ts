// One-time owner bootstrap.
//
// Reads OWNER_EMAIL + OWNER_PASSWORD from the environment and creates the
// single owner account if it does not already exist. Safe to re-run.
//
// Usage:
//   bun run scripts/bootstrap-owner.ts

import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

async function main() {
  const email = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD ?? "";
  if (!email) {
    console.error("OWNER_EMAIL is not set in the environment.");
    process.exit(1);
  }
  if (!password) {
    console.error("OWNER_PASSWORD is not set in the environment.");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("OWNER_PASSWORD must be at least 6 characters.");
    process.exit(1);
  }

  const existing = await db.user.count();
  if (existing > 0) {
    const existingUser = await db.user.findFirst();
    console.log(
      `Owner already exists (email: ${existingUser?.email}). Nothing to do.`,
    );
    return;
  }

  const user = await db.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      role: "owner",
    },
  });
  console.log(`Owner created: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
