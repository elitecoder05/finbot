import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'

const adapter = new PrismaLibSql({
  url: 'file:./prisma/dev.db',
})

const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  await prisma.user.upsert({
    where: { username: 'father' },
    update: {},
    create: {
      username: 'father',
      passwordHash,
      role: 'father',
      name: 'Father',
      email: 'father@example.com',
    },
  })

  await prisma.user.upsert({
    where: { username: 'brother' },
    update: {},
    create: {
      username: 'brother',
      passwordHash,
      role: 'brother',
      name: 'Brother',
      email: 'brother@example.com',
    },
  })

  await prisma.user.upsert({
    where: { username: 'me' },
    update: {},
    create: {
      username: 'me',
      passwordHash,
      role: 'me',
      name: 'Me',
      email: 'me@example.com',
    },
  })

}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
