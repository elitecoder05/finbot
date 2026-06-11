import type { TransactionType } from '@/types'

export interface RuleClassification {
  transactionType: TransactionType
}

const PURCHASE_KEYWORDS = ['bought', 'purchased', 'brought', 'buy', 'ordered', 'placed order']
const PAYMENT_KEYWORDS = ['paid', 'payment', 'gave', 'give', 'rent', 'salary', 'wages', 'labor', 'charges', 'bill', 'fee', 'tax', 'advance', 'refund', 'returned', 'sent', 'transferred']

function matchAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.toLowerCase().includes(kw))
}

export function classifyTransaction(text: string): RuleClassification {
  const lower = text.toLowerCase()

  if (matchAny(lower, PURCHASE_KEYWORDS)) {
    return { transactionType: 'purchase' }
  }
  if (matchAny(lower, PAYMENT_KEYWORDS)) {
    return { transactionType: 'payment' }
  }

  return { transactionType: 'payment' }
}

export function inferTransactionTypeFromPattern(
  text: string
): TransactionType {
  const rule = classifyTransaction(text)
  return rule.transactionType
}
