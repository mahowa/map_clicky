/**
 * Prisma Client singleton, using the node-postgres (PrismaPg) driver adapter
 * against Prisma Postgres. Server-side only — never import this from a browser
 * / client component. The singleton avoids exhausting connections during
 * Next.js dev hot-reloads.
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const connectionString = process.env.DATABASE_URL

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const adapter = new PrismaPg({ connectionString })

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
