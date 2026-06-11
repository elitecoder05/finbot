import { prisma } from '@/lib/db/client'

export interface DictionaryMatch {
  matchedProducts: string[]
  matchedParties: string[]
  productCandidates: string[]
  partyCandidates: string[]
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function containsWord(haystack: string, needle: string): boolean {
  const h = normalise(haystack)
  const n = normalise(needle)
  return h.includes(n)
}

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'was',
  'and',
  'or',
  'but',
  'for',
  'to',
  'of',
  'in',
  'on',
  'at',
  'from',
  'with',
  'by',
  'about',
  'worth',
  'from',
  'for',
  'paid',
  'bought',
  'purchased',
  'sold',
  'received',
  'transferred',
  'sent',
  'gave',
  'got',
])

function extractUnknownTokenChunks(text: string, minLen = 3): string[] {
  const words = normalise(text).split(' ').filter((w) => w.length >= minLen && !STOP_WORDS.has(w))

  const chunks: string[] = []
  for (let i = 0; i < words.length; i++) {
    for (let len = 2; len <= Math.min(4, words.length - i); len++) {
      chunks.push(words.slice(i, i + len).join(' '))
    }
  }
  return chunks
}

export async function matchDictionaries(rawText: string): Promise<DictionaryMatch> {
  const [products, parties] = await Promise.all([
    prisma.product.findMany({ select: { name: true } }),
    prisma.party.findMany({ select: { name: true, type: true } }),
  ])

  const knownProducts = products.map((p) => p.name)
  const knownParties = parties.map((p) => p.name)

  const matchedProducts: string[] = []
  const matchedParties: string[] = []
  const productCandidates: string[] = []
  const partyCandidates: string[] = []

  for (const name of knownProducts) {
    if (containsWord(rawText, name)) {
      matchedProducts.push(name)
    } else {
      for (const chunk of extractUnknownTokenChunks(rawText)) {
        if (chunk.length >= name.length - 1 && (name.includes(chunk) || chunk.includes(name))) {
          productCandidates.push(name)
          break
        }
      }
    }
  }

  for (const name of knownParties) {
    if (containsWord(rawText, name)) {
      matchedParties.push(name)
    }
  }

  for (const chunk of extractUnknownTokenChunks(rawText)) {
    for (const name of knownParties) {
      if (
        (name.includes(chunk) || chunk.includes(name)) &&
        !matchedParties.includes(name)
      ) {
        partyCandidates.push(name)
        break
      }
    }
  }

  return {
    matchedProducts: [...new Set(matchedProducts)],
    matchedParties: [...new Set(matchedParties)],
    productCandidates: [...new Set(productCandidates)],
    partyCandidates: [...new Set(partyCandidates)],
  }
}
