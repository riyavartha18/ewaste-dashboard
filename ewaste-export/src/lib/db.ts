import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

// Ensure fallback DATABASE_URL so Prisma never crashes on Vercel/serverless environments
if (!process.env.DATABASE_URL) {
  const prismaDb = path.join(process.cwd(), 'prisma', 'custom.db');
  const rootDb = path.join(process.cwd(), 'db', 'custom.db');
  if (fs.existsSync(prismaDb)) {
    process.env.DATABASE_URL = `file:${prismaDb}`;
  } else if (fs.existsSync(rootDb)) {
    process.env.DATABASE_URL = `file:${rootDb}`;
  } else {
    process.env.DATABASE_URL = 'file:./custom.db';
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db