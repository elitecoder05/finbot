import { describe, it, expect } from 'vitest'
import { classifyTransaction, inferTransactionTypeFromPattern } from '@/lib/extraction/rule-engine'

describe('classifyTransaction', () => {
  it('classifies purchase', () => {
    expect(classifyTransaction('Bought cement from Suresh').transactionType).toBe('purchase')
    expect(classifyTransaction('Purchased 25 bags from Ravi').transactionType).toBe('purchase')
  })

  it('classifies sale', () => {
    expect(classifyTransaction('Sold bricks worth 10000 to Vinod').transactionType).toBe('sale')
    expect(classifyTransaction('Selling goods to Ganesh').transactionType).toBe('sale')
  })

  it('classifies expense via "paid" keyword', () => {
    expect(classifyTransaction('Paid rent 12000').transactionType).toBe('expense')
    expect(classifyTransaction('PAID Labor charges 5000 to Kumar').transactionType).toBe('expense')
  })

  it('classifies income via "received" keyword', () => {
    expect(classifyTransaction('Received 2500 from Vinod').transactionType).toBe('income')
  })

  it('classifies transfer via "transferred" keyword', () => {
    expect(classifyTransaction('Transferred 5000 to brother').transactionType).toBe('transfer')
  })

  it('returns expense when "advance" standalone is not in advance keywords', () => {
    expect(classifyTransaction('Paid 3000 to someone').transactionType).toBe('expense')
  })

  it('classifies other when no keyword matches', () => {
    expect(classifyTransaction('Gave 1000 to church').transactionType).toBe('other')
  })

  it('sets outgoing for purchases, expenses, transfers', () => {
    expect(classifyTransaction('Bought cement').paymentDirection).toBe('outgoing')
    expect(classifyTransaction('Paid 5000').paymentDirection).toBe('outgoing')
    expect(classifyTransaction('Transferred 3000').paymentDirection).toBe('outgoing')
  })

  it('sets incoming for sales and income', () => {
    expect(classifyTransaction('Sold goods').paymentDirection).toBe('incoming')
    expect(classifyTransaction('Received 3000').paymentDirection).toBe('incoming')
  })
})

describe('inferTransactionTypeFromPattern', () => {
  it('overrides with payment direction for ambiguous text', () => {
    expect(inferTransactionTypeFromPattern('Unknown transaction text', 'incoming')).toBe('income')
    expect(inferTransactionTypeFromPattern('Unknown transaction text', 'outgoing')).toBe('expense')
  })

  it('returns purchase when rule engine already classified', () => {
    expect(inferTransactionTypeFromPattern('Bought cement', null)).toBe('purchase')
    expect(inferTransactionTypeFromPattern('Sold goods', null)).toBe('sale')
  })
})
