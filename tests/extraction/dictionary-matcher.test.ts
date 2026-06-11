import type { DictionaryMatch } from '@/lib/extraction/dictionary-matcher'
import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '@/lib/db/client'
import { matchDictionaries } from '@/lib/extraction/dictionary-matcher'

describe('matchDictionaries', () => {
  beforeAll(async () => {
    const products = [
      { name: 'cement' },
      { name: 'sand' },
      { name: 'bricks' },
      { name: 'steel' },
    ]
    for (const p of products) {
      await prisma.product.upsert({ where: { name: p.name }, update: {}, create: p })
    }

    const parties = [
      { name: 'Suresh', type: 'person' },
      { name: 'Ravi', type: 'person' },
      { name: 'Mahesh', type: 'person' },
      { name: 'Vinod', type: 'person' },
      { name: 'Ganesh', type: 'person' },
    ]
    for (const p of parties) {
      await prisma.party.upsert({ where: { name: p.name }, update: {}, create: p })
    }
  })

  it('matches known product', async () => {
    const r = (await matchDictionaries('Bought 1500 worth cement from Suresh')) as DictionaryMatch
    expect(r.matchedProducts).toContain('cement')
    expect(r.matchedParties).toContain('Suresh')
  })

  it('matches known person', async () => {
    const r = (await matchDictionaries('Paid 5000 to Mahesh')) as DictionaryMatch
    expect(r.matchedParties).toContain('Mahesh')
  })

  it('matches known person from sale text', async () => {
    const r = (await matchDictionaries('Sold bricks worth 10000 to Vinod')) as DictionaryMatch
    expect(r.matchedProducts).toContain('bricks')
    expect(r.matchedParties).toContain('Vinod')
  })

  it('returns empty arrays for unknown entities', async () => {
    const r = (await matchDictionaries('Random message with no known products or parties')) as DictionaryMatch
    expect(r.matchedProducts.length).toBe(0)
    expect(r.matchedParties.length).toBe(0)
  })

  it('handles case insensitive matching', async () => {
    const r = (await matchDictionaries('Bought CEMENT from suresh')) as DictionaryMatch
    expect(r.matchedProducts).toContain('cement')
    expect(r.matchedParties).toContain('Suresh')
  })
})
