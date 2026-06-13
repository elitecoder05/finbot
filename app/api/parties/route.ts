import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { requireSession } from '@/lib/auth'

// GET /api/parties - list all parties, optionally with search
export async function GET(request: Request) {
  try {
    await requireSession()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim().toLowerCase() || ''
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (search) {
      const parties = await prisma.party.findMany({
        take: Math.min(limit, 100),
        orderBy: { name: 'asc' },
      })

      // Fuzzy filter: include parties where name contains the search term
      // or where edit distance is small
      const filtered = parties
        .map((p) => ({
          ...p,
          score: fuzzyScore(p.name.toLowerCase(), search),
        }))
        .filter((p) => p.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)

      return NextResponse.json({ parties: filtered })
    }

    const parties = await prisma.party.findMany({
      take: Math.min(limit, 100),
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ parties })
  } catch (error) {
    console.warn('/api/parties GET error, falling back to empty list:', error)
    return NextResponse.json({ parties: [] })
  }
}

// POST /api/parties - create a new party
export async function POST(request: Request) {
  try {
    await requireSession()
    const body = await request.json()
    const bodyData = body as { name?: string; type?: string }
    const name = bodyData.name
    const partyType = bodyData.type

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Party name is required (min 2 chars)' }, { status: 400 })
    }

    const trimmedName = name.trim()

    const existing = await prisma.party.findUnique({ where: { name: trimmedName } })
    if (existing) {
      return NextResponse.json({ party: existing, alreadyExisted: true })
    }

    const party = await prisma.party.create({
      data: {
        name: trimmedName,
        type: partyType || 'person',
      },
    })

    return NextResponse.json({ party }, { status: 201 })
  } catch (error) {
    console.error('/api/parties POST error:', error)
    return NextResponse.json({ error: 'Failed to create party' }, { status: 500 })
  }
}

// Simple fuzzy scoring: combination of substring match and Levenshtein similarity
function fuzzyScore(name: string, query: string): number {
  // Exact match
  if (name === query) return 1.0
  // Contains query
  if (name.includes(query)) return 0.9
  // Query contains name
  if (query.includes(name)) return 0.85

  // Levenshtein distance ratio
  const distance = levenshtein(name, query)
  const maxLen = Math.max(name.length, query.length)
  const similarity = 1 - distance / maxLen

  // Also check if any word in the name is close to the query
  const words = name.split(/\s+/)
  let bestWordScore = 0
  for (const word of words) {
    const wordDist = levenshtein(word, query)
    const wordSim = 1 - wordDist / Math.max(word.length, query.length)
    if (wordSim > bestWordScore) bestWordScore = wordSim
  }

  return Math.max(similarity * 0.8, bestWordScore * 0.7)
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}
