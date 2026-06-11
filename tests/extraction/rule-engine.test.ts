import { describe, it, expect } from 'vitest'
import { classifyTransaction, inferTransactionTypeFromPattern } from '@/lib/extraction/rule-engine'

describe('classifyTransaction', () => {
  it('classifies purchase', () => {
    expect(classifyTransaction('Bought cement from Suresh').transactionType).toBe('purchase')
    expect(classifyTransaction('Purchased 25 bags from Ravi').transactionType).toBe('purchase')
  })

  it('classifies payment via "paid" keyword', () => {
    expect(classifyTransaction('Paid rent 12000').transactionType).toBe('payment')
    expect(classifyTransaction('PAID Labor charges 5000 to Kumar').transactionType).toBe('payment')
  })

  it('classifies payment via "gave" keyword', () => {
    expect(classifyTransaction('Gave 1000 to church').transactionType).toBe('payment')
  })

  it('classifies payment via "transferred" keyword', () => {
    expect(classifyTransaction('Transferred 5000 to brother').transactionType).toBe('payment')
  })

  it('classifies payment when no purchase keyword matches', () => {
    expect(classifyTransaction('Some random text').transactionType).toBe('payment')
  })
})

describe('inferTransactionTypeFromPattern', () => {
  it('returns purchase when rule engine already classified', () => {
    expect(inferTransactionTypeFromPattern('Bought cement')).toBe('purchase')
  })

  it('returns payment for non-purchase text', () => {
    expect(inferTransactionTypeFromPattern('Some random text')).toBe('payment')
  })
})
