import type { AIExtractionResult } from '@/types'
import type { RegexExtraction } from './regex-extractor'
import type { RuleClassification } from './rule-engine'
import type { GeminiExtractionOutput } from './gemini-extractor'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  confidence: number
  requiresUserConfirmation: boolean
}

const SUSPICIOUS_PERSON_PATTERNS = [
  /^(?:worth|for|from|to|and|the|a|an|of|in|on|at|with|by)$/i,
  /^(?:bought|purchased|sold|paid|received|transferred|gave|got|sent)$/i,
  /\d/,
  /^.{1,2}$/,
]

export function validateExtraction(
  rawText: string,
  regexResult: RegexExtraction,
  ruleResult: RuleClassification | null,
  geminiResult: GeminiExtractionOutput
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const result: ValidationResult = {
    isValid: true,
    errors,
    warnings,
    confidence: geminiResult.confidence,
    requiresUserConfirmation: false,
  }

  if (geminiResult.amount === null && regexResult.amount === null) {
    errors.push('No amount detected in the input.')
  }

  const validTypes = ['purchase', 'payment']
  if (!validTypes.includes(geminiResult.transactionType)) {
    errors.push(`Invalid transaction type: ${geminiResult.transactionType}`)
  }

  if (geminiResult.person && SUSPICIOUS_PERSON_PATTERNS.some((p) => p.test(geminiResult.person!))) {
    warnings.push(`Person name "${geminiResult.person}" looks suspicious and may be incorrect.`)
  }

  if (
    (geminiResult.transactionType === 'purchase' || geminiResult.transactionType === 'payment') &&
    !geminiResult.person
  ) {
    warnings.push('Transaction has no person identified.')
  }

  if (geminiResult.quantity !== null && !geminiResult.unit) {
    warnings.push('Quantity detected but no unit specified.')
  }
  if (!geminiResult.quantity && regexResult.quantity !== null) {
    warnings.push('Regex detected quantity but final result has none.')
  }

  const confidenceThreshold = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.7')
  if (geminiResult.confidence < confidenceThreshold) {
    result.requiresUserConfirmation = true
    warnings.push(`Confidence ${(geminiResult.confidence * 100).toFixed(0)}% is below threshold (${(confidenceThreshold * 100).toFixed(0)}%). User confirmation required.`)
  }

  if (errors.length > 0) {
    result.isValid = false
  }

  result.confidence = Math.max(0.1, Math.min(1, geminiResult.confidence - warnings.length * 0.05))

  return result
}

export function buildAiExtractionResult(
  geminiResult: GeminiExtractionOutput,
  regexResult: RegexExtraction
): AIExtractionResult {
  return {
    transactionType: geminiResult.transactionType,
    amount: geminiResult.amount ?? regexResult.amount ?? null,
    product: geminiResult.product,
    person: geminiResult.person,
    quantity: geminiResult.quantity ?? regexResult.quantity ?? null,
    unit: geminiResult.unit ?? regexResult.unit ?? null,
    notes: geminiResult.notes,
    confidence: geminiResult.confidence,
    date: regexResult.date,
  }
}
