// Transaction Types
export type TransactionType = 
  | 'purchase'
  | 'sale'
  | 'expense'
  | 'income'
  | 'transfer'
  | 'advance'
  | 'other'

export type TransactionStatus = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'

// User Roles
export type UserRole = 'father' | 'brother' | 'me'

// AI Extraction Result
export interface AIExtractionResult {
  transactionType: TransactionType
  amount: number | null
  product: string | null
  vendor: string | null
  customer: string | null
  quantity: number | null
  unit: string | null
  notes: string | null
  confidence: number
  date?: string | null
  paymentDirection?: 'incoming' | 'outgoing' | null
}

// Regex Extraction Result
export interface RegexExtraction {
  amount: number | null
  quantity: number | null
  unit: string | null
  date: string | null
}

// Chat Message Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  extraction?: AIExtractionResult
  transactionId?: string
}