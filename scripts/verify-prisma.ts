/**
 * Smoke test: open the Prisma Postgres connection and run one read.
 * Run with `npx tsx scripts/verify-prisma.ts`.
 */
import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  const authorCount = await prisma.author.count()
  const sample = await prisma.author.findFirst({ include: { books: true } })

  console.log('✅ Connected to Prisma Postgres')
  console.log(`   authors: ${authorCount}`)
  if (sample) {
    console.log(`   sample:  ${sample.name} — ${sample.books.length} book(s)`)
  }

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('❌ Prisma connection/read failed:')
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
