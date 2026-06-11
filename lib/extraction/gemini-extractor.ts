import type { TransactionType } from '@/types'

export interface GeminiExtractionInput {
  rawText: string
  regexResult: {
    amount: number | null
    quantity: number | null
    unit: string | null
    date: string | null
  }
  ruleResult: {
    transactionType: string
    paymentDirection: string | null
  }
  knownProducts: string[]
  knownParties: string[]
}

export interface GeminiExtractionOutput {
  transactionType: TransactionType
  amount: number | null
  product: string | null
  vendor: string | null
  customer: string | null
  quantity: number | null
  unit: string | null
  notes: string | null
  paymentDirection: 'incoming' | 'outgoing' | null
  confidence: number
  reasoning?: string
}

interface GeminiPart {
  text: string
}

interface GeminiResponse {
  candidates?: { content: { parts: GeminiPart[] } }[]
}

const VALID_TYPES: TransactionType[] = [
  'purchase', 'sale', 'expense', 'income', 'transfer', 'advance', 'other',
]

function narrowType(t: string): TransactionType {
  return VALID_TYPES.includes(t as TransactionType) ? (t as TransactionType) : 'other'
}

function narrowDirection(d: string | null): 'incoming' | 'outgoing' | null {
  if (d === 'incoming' || d === 'outgoing') return d
  return null
}

async function callGeminiDirect(prompt: string, apiKey: string, modelName: string, temperature: number): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${body}`)
  }

  const data = (await res.json()) as GeminiResponse
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini')
  return text
}

export async function extractWithGemini(
  input: GeminiExtractionInput,
  options?: { apiKey?: string }
): Promise<GeminiExtractionOutput> {
  const { rawText, regexResult, ruleResult, knownProducts, knownParties } = input
  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY
  const modelName = process.env.AI_MODEL || 'gemini-2.0-flash'
  const temperature = parseFloat(process.env.AI_TEMPERATURE || '0.1')

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const prompt = `You are an accounting data extraction assistant. Extract structured data from the following natural language financial transaction description.

RULES:
- Never invent data. Use null for unknown fields.
- "vendor" is the entity we PAID money TO.
- "customer" is the entity we RECEIVED money FROM.
- Do not include the amount in the party name.
- For "bought/purchased X from Y", Y is the vendor.
- For "sold X to Y", Y is the customer.
- "paymentDirection" is "incoming" if money comes INTO the family, "outgoing" if money goes OUT.

Known products: ${knownProducts.length > 0 ? knownProducts.join(', ') : 'None'}
Known parties: ${knownParties.length > 0 ? knownParties.join(', ') : 'None'}

PRE-EXTRACTED DATA (from regex and rule engines):
- Detected amount: ${regexResult.amount ?? 'null'}
- Detected quantity: ${regexResult.quantity ?? 'null'}
- Detected unit: ${regexResult.unit ?? 'null'}
- Detected date: ${regexResult.date ?? 'null'}
- Rule-based transaction type: ${ruleResult.transactionType ?? 'null'}
- Rule-based payment direction: ${ruleResult.paymentDirection ?? 'null'}

RAW USER INPUT:
"${rawText}"

Return ONLY a valid JSON object with this exact schema:
{
  "transactionType": "purchase" | "sale" | "expense" | "income" | "transfer" | "advance" | "other",
  "amount": number | null,
  "product": string | null,
  "vendor": string | null,
  "customer": string | null,
  "quantity": number | null,
  "unit": string | null,
  "notes": string | null,
  "paymentDirection": "incoming" | "outgoing" | null,
  "confidence": number,
  "reasoning": string
}`

  const text = await callGeminiDirect(prompt, apiKey, modelName, temperature)

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      transactionType: narrowType(parsed.transactionType ?? ruleResult.transactionType ?? 'other'),
      amount: typeof parsed.amount === 'number' ? parsed.amount : (regexResult.amount ?? null),
      product: typeof parsed.product === 'string' ? parsed.product : null,
      vendor: typeof parsed.vendor === 'string' ? parsed.vendor : null,
      customer: typeof parsed.customer === 'string' ? parsed.customer : null,
      quantity: typeof parsed.quantity === 'number' ? parsed.quantity : (regexResult.quantity ?? null),
      unit: typeof parsed.unit === 'string' ? parsed.unit : (regexResult.unit ?? null),
      notes: typeof parsed.notes === 'string' ? parsed.notes : null,
      paymentDirection: narrowDirection(parsed.paymentDirection) ?? narrowDirection(ruleResult.paymentDirection) ?? null,
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined,
    }
  } catch {
    return {
      transactionType: narrowType(ruleResult.transactionType ?? 'other'),
      amount: regexResult.amount,
      product: null,
      vendor: null,
      customer: null,
      quantity: regexResult.quantity,
      unit: regexResult.unit,
      notes: null,
      paymentDirection: narrowDirection(ruleResult.paymentDirection),
      confidence: 0.3,
      reasoning: 'Failed to parse Gemini response, fell back to rule/regex results',
    }
  }
}
