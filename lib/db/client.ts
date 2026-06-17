import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import 'dotenv/config'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const databaseUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL!

const adapter = new PrismaLibSql({
  url: databaseUrl,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
})

export const prisma =
  global.prisma ||
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}
