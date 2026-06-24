/**
 * Seed a handful of starter rows. Run with `npx prisma db seed`
 * (wired via prisma.config.ts → migrations.seed).
 */
import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  // Idempotent-ish: clear starter tables first so re-seeding stays clean.
  await prisma.book.deleteMany()
  await prisma.author.deleteMany()

  const ursula = await prisma.author.create({
    data: {
      name: 'Ursula K. Le Guin',
      books: {
        create: [
          { title: 'A Wizard of Earthsea' },
          { title: 'The Left Hand of Darkness' },
        ],
      },
    },
    include: { books: true },
  })

  const borges = await prisma.author.create({
    data: {
      name: 'Jorge Luis Borges',
      books: { create: [{ title: 'Ficciones' }] },
    },
    include: { books: true },
  })

  console.log(
    `🌱 Seeded ${2} authors (${ursula.books.length + borges.books.length} books)`,
  )
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
