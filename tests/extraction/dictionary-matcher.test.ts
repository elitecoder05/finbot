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
      { name: 'Suresh', type: 'vendor' },
      { name: 'Ravi', type: 'vendor' },
      { name: 'Mahesh', type: 'vendor' },
      { name: 'Vinod', type: 'customer' },
      { name: 'Ganesh', type: 'customer' },
    ]
    for (const p of parties) {
      await prisma.party.upsert({ where: { name: p.name }, update: {}, create: p })
    }
  })

  it('matches known product', async () => {
    const r = (await matchDictionaries('Bought 1500 worth cement from Suresh')) as DictionaryMatch
    expect(r.matchedProducts).toContain('cement')
    expect(r.matchedVendors).toContain('Suresh')
  })

  it('matches known vendor', async () => {
    const r = (await matchDictionaries('Paid 5000 to Mahesh')) as DictionaryMatch
    expect(r.matchedVendors).toContain('Mahesh')
  })

  it('matches known customer', async () => {
    const r = (await matchDictionaries('Sold bricks worth 10000 to Vinod')) as DictionaryMatch
    expect(r.matchedProducts).toContain('bricks')
    expect(r.matchedCustomers).toContain('Vinod')
  })

  it('returns empty arrays for unknown entities', async () => {
    const r = (await matchDictionaries('Random message with no known products or parties')) as DictionaryMatch
    expect(r.matchedProducts.length).toBe(0)
    expect(r.matchedVendors.length).toBe(0)
    expect(r.matchedCustomers.length).toBe(0)
  })

  it('handles case insensitive matching', async () => {
    const r = (await matchDictionaries('Bought CEMENT from suresh')) as DictionaryMatch
    expect(r.matchedProducts).toContain('cement')
    expect(r.matchedVendors).toContain('Suresh')
  })
})
