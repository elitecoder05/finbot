import { describe, it, expect } from 'vitest'
import { validateExtraction, buildAiExtractionResult } from '@/lib/extraction/validation-engine'
import type { RegexExtraction } from '@/lib/extraction/regex-extractor'
import type { GeminiExtractionOutput } from '@/lib/extraction/gemini-extractor'

const baseRegex: RegexExtraction = {
  amount: 1500,
  quantity: null,
  unit: null,
  date: '2026-06-10',
  rawAmountText: '1500',
  rawQuantityText: null,
  detectedCurrencies: [],
}

function makeGemini(overrides: Partial<GeminiExtractionOutput> = {}): GeminiExtractionOutput {
  return {
    transactionType: 'purchase' as const,
    amount: 1500,
    product: 'cement',
    vendor: 'Suresh',
    customer: null,
    quantity: null,
    unit: null,
    notes: null,
    paymentDirection: 'outgoing' as const,
    confidence: 0.95,
    ...overrides,
  }
}

describe('validateExtraction', () => {
  it('marks a clean purchase as valid and auto-confirmed', () => {
    const r = validateExtraction('Bought cement from Suresh', baseRegex, null, makeGemini())
    expect(r.isValid).toBe(true)
    expect(r.requiresUserConfirmation).toBe(false)
  })

  it('flags missing amount as invalid', () => {
    const r = validateExtraction('Bought cement', { ...baseRegex, amount: null }, null, makeGemini({ amount: null }))
    expect(r.isValid).toBe(false)
    expect(r.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('amount')])
    )
  })

  it('warns when vendor name looks like leftover text', () => {
    const r = validateExtraction(
      'Bought 500 worth cement from Suresh',
      baseRegex,
      null,
      makeGemini({ vendor: 'from' })
    )
    expect(r.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('suspicious')])
    )
  })

  it('warns on both vendor and customer for purchase', () => {
    const r = validateExtraction('Bought cement', baseRegex, null, makeGemini({ customer: 'Vinod' }))
    expect(r.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('vendor')])
    )
  })

  it('warns on missing party for outgoing transaction', () => {
    const r = validateExtraction('Some purchase', baseRegex, null, makeGemini({ vendor: null, customer: null }))
    expect(r.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('vendor')])
    )
  })

  it('requires confirmation when confidence below 0.7', () => {
    const r = validateExtraction('Some transaction', baseRegex, null, makeGemini({ confidence: 0.4, transactionType: 'other' }))
    expect(r.requiresUserConfirmation).toBe(true)
    expect(r.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('threshold')])
    )
  })
})

describe('buildAiExtractionResult', () => {
  it('prefers gemini values over regex', () => {
    const r = buildAiExtractionResult(makeGemini(), baseRegex)
    expect(r.amount).toBe(1500)
    expect(r.product).toBe('cement')
  })

  it('falls back to regex when gemini amount is null', () => {
    const r = buildAiExtractionResult(makeGemini({ amount: null }), baseRegex)
    expect(r.amount).toBe(1500)
  })

  it('includes date from regex', () => {
    const r = buildAiExtractionResult(makeGemini(), baseRegex)
    expect(r.date).toBe('2026-06-10')
  })
})
