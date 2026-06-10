import { describe, it, expect } from 'vitest'
import { extractRegex } from '@/lib/extraction/regex-extractor'

describe('extractRegex', () => {
  it('extracts amount with Rs prefix', () => {
    const r = extractRegex('Paid rent 5000')
    expect(r.amount).toBe(5000)
  })

  it('extracts amount with "for" keyword', () => {
    const r = extractRegex('Paid Kumar 5000 labor charges')
    expect(r.amount).toBe(5000)
  })

  it('extracts amount with "worth" keyword', () => {
    const r = extractRegex('Sold bricks worth 10000 to Vinod')
    expect(r.amount).toBe(10000)
  })

  it('handles comma-formatted amounts', () => {
    const r = extractRegex('Purchased items for 15,000')
    expect(r.amount).toBe(15000)
  })

  it('extracts decimal amounts', () => {
    const r = extractRegex('Transferred 5000.50 to brother')
    expect(r.amount).toBe(5000.5)
  })

  it('returns null when no amount found', () => {
    const r = extractRegex('Hello world')
    expect(r.amount).toBeNull()
  })

  it('extracts quantity and unit', () => {
    const r = extractRegex('Purchased 25 bags cement from Ravi for 15000')
    expect(r.quantity).toBe(25)
    expect(r.unit).toBe('bag')
  })

  it("returns null when no date pattern matched", () => {
    const r = extractRegex("No date here, paid rent 5000")
    expect(r.date).toBeNull()
  })
})
