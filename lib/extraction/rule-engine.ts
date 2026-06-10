import type { TransactionType } from '@/types'

export interface RuleClassification {
  transactionType: TransactionType
  paymentDirection: 'incoming' | 'outgoing' | null
}

const PURCHASE_KEYWORDS = ['bought', 'purchased', 'brought', 'buy', 'ordered', 'placed order']
const SALE_KEYWORDS = ['sold', 'selling', 'sale', 'dispatched', 'delivered goods']
const EXPENSE_KEYWORDS = ['paid', 'payment', 'expense', 'rent', 'salary', 'wages', 'labor', 'charges', 'bill', 'fee', 'tax']
const INCOME_KEYWORDS = ['received', 'income', 'gift', 'donation', 'collected', 'cash in']
const TRANSFER_KEYWORDS = ['transferred', 'transfer', 'sent to']
const ADVANCE_KEYWORDS = ['advance', 'advance payment', 'paid advance']
const REFUND_KEYWORDS = ['refund', 'returned', 'return']

function matchAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.toLowerCase().includes(kw))
}

export function classifyTransaction(text: string): RuleClassification {
  const lower = text.toLowerCase()

  if (matchAny(lower, REFUND_KEYWORDS)) {
    return { transactionType: 'expense', paymentDirection: 'outgoing' }
  }
  if (matchAny(lower, PURCHASE_KEYWORDS)) {
    return { transactionType: 'purchase', paymentDirection: 'outgoing' }
  }
  if (matchAny(lower, SALE_KEYWORDS)) {
    return { transactionType: 'sale', paymentDirection: 'incoming' }
  }
  if (matchAny(lower, EXPENSE_KEYWORDS)) {
    return { transactionType: 'expense', paymentDirection: 'outgoing' }
  }
  if (matchAny(lower, INCOME_KEYWORDS)) {
    return { transactionType: 'income', paymentDirection: 'incoming' }
  }
  if (matchAny(lower, TRANSFER_KEYWORDS)) {
    return { transactionType: 'transfer', paymentDirection: 'outgoing' }
  }
  if (matchAny(lower, ADVANCE_KEYWORDS)) {
    return { transactionType: 'advance', paymentDirection: 'outgoing' }
  }

  return { transactionType: 'other', paymentDirection: null }
}

export function inferTransactionTypeFromPattern(
  text: string,
  paymentDirection: 'incoming' | 'outgoing' | null
): TransactionType {
  const rule = classifyTransaction(text)
  if (rule.transactionType !== 'other') return rule.transactionType

  if (paymentDirection === 'incoming') return 'income'
  if (paymentDirection === 'outgoing') return 'expense'

  return 'other'
}
