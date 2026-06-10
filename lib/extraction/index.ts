import type { AIExtractionResult } from '@/types'
import { extractRegex } from './regex-extractor'
import { classifyTransaction } from './rule-engine'
import { matchDictionaries } from './dictionary-matcher'
import { extractWithGemini } from './gemini-extractor'
import { validateExtraction, buildAiExtractionResult } from './validation-engine'
import { prisma } from '@/lib/db/client'

export interface ExtractionResult {
  success: boolean
  extraction: AIExtractionResult | null
  validation: ReturnType<typeof validateExtraction> | null
  rawGeminiOutput?: string
  error?: string
}

export interface ExtractionOptions {
  geminiApiKey?: string
  modelName?: string
  temperature?: number
}

export async function extractTransaction(rawText: string, options?: ExtractionOptions): Promise<ExtractionResult> {
  if (!rawText || rawText.trim().length < 3) {
    return { success: false, extraction: null, validation: null, error: 'Input too short' }
  }

  const regexResult = extractRegex(rawText)
  const ruleResult = classifyTransaction(rawText)

  let dictionaryResult: Awaited<ReturnType<typeof matchDictionaries>> = {
    matchedProducts: [],
    matchedVendors: [],
    matchedCustomers: [],
    productCandidates: [],
    partyCandidates: [],
  }
  try {
    dictionaryResult = await matchDictionaries(rawText)
  } catch {
    // dictionary match is optional; continue without it
  }

  let geminiOutput: Awaited<ReturnType<typeof extractWithGemini>> | null = null
  try {
    geminiOutput = await extractWithGemini(
      {
        rawText,
        regexResult: {
          amount: regexResult.amount,
          quantity: regexResult.quantity,
          unit: regexResult.unit,
          date: regexResult.date,
        },
        ruleResult: {
          transactionType: ruleResult.transactionType,
          paymentDirection: ruleResult.paymentDirection,
        },
        knownProducts: dictionaryResult.matchedProducts,
        knownParties: [...dictionaryResult.matchedVendors, ...dictionaryResult.matchedCustomers],
      },
      options
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gemini extraction failed'
    return {
      success: false,
      extraction: null,
      validation: null,
      error: message,
    }
  }

  const validation = validateExtraction(rawText, regexResult, ruleResult, geminiOutput)

  if (!validation.isValid && geminiOutput.amount === null && regexResult.amount === null) {
    return {
      success: false,
      extraction: null,
      validation,
      error: 'Extraction failed — critical fields missing.',
    }
  }

  const extraction = buildAiExtractionResult(geminiOutput, regexResult)

  try {
    await prisma.aIExtraction.create({
      data: {
        input: rawText,
        output: JSON.stringify(geminiOutput),
        regexResult: JSON.stringify(regexResult),
        ruleResult: JSON.stringify(ruleResult),
        confidence: extraction.confidence,
        validation: JSON.stringify(validation),
      },
    })
  } catch {
    // logging AI extraction failures must not break the user flow
  }

  return {
    success: true,
    extraction,
    validation,
    rawGeminiOutput: JSON.stringify(geminiOutput, null, 2),
  }
}
