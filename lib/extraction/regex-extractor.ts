export interface RegexExtraction {
  amount: number | null
  quantity: number | null
  unit: string | null
  date: string | null
  rawAmountText: string | null
  rawQuantityText: string | null
  detectedCurrencies: string[]
}

const AMOUNT_PATTERNS = [
  /₹\s*([\d,]+(?:\.\d+)?)/,
  /Rs\.?\s*([\d,]+(?:\.\d+)?)/,
  /rupees?\s*(?:of\s+)?([\d,]+(?:\.\d+)?)/i,
  /\b([\d,]+(?:\.\d+)?)\s*(?:rupees?|rs\.?|₹)/i,
  /\b(?:for|worth|cost(?:ing|s)?|price|amount(?:ing)?)\s+(?:of\s+)?(?:Rs\.?\s*|₹\s*)?([\d,]+(?:\.\d+)?)/i,
  /\b([\d,]+(?:\.\d+)?)\b/,
]

const QUANTITY_PATTERN = /(\d+(?:\.\d+)?)\s*(bags?|pieces?|pcs?|kgs?|kilograms?|tons?|liters?|litres?|ml|cubic\s+feet|cu\s+ft|cft|buckets?|trucks?|units?|sacks?|packs?|boxes?)\b/i

const DATE_PATTERNS = [
  { pattern: /today/i, offset: 0 },
  { pattern: /yesterday/i, offset: -1 },
  { pattern: /day\s+before\s+yesterday/i, offset: -2 },
  { pattern: /last\s+(?:week|month|year)/i, offset: null },
  { pattern: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/, offset: null },
  { pattern: /(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4})/i, offset: null },
]

const KNOWN_CURRENCY_SYMBOLS = ['₹', 'Rs', 'rupees']

export function extractRegex(text: string): RegexExtraction {
  const result: RegexExtraction = {
    amount: null,
    quantity: null,
    unit: null,
    date: null,
    rawAmountText: null,
    rawQuantityText: null,
    detectedCurrencies: [],
  }

  const normalized = text.trim()

  for (const sym of KNOWN_CURRENCY_SYMBOLS) {
    if (new RegExp(`\\b${sym}\\b`, 'i').test(normalized)) {
      result.detectedCurrencies.push(sym)
    }
  }

  let amount: number | null = null
  let amountText: string | null = null

  for (const pattern of AMOUNT_PATTERNS) {
    const match = normalized.match(pattern)
    if (match) {
      const raw = match[1].replace(/,/g, '')
      const parsed = parseFloat(raw)
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed
        amountText = match[0]
        break
      }
    }
  }

  if (amount !== null) {
    result.amount = amount
    result.rawAmountText = amountText
  }

  const qtyMatch = normalized.match(QUANTITY_PATTERN)
  if (qtyMatch) {
    result.quantity = parseFloat(qtyMatch[1])
    result.unit = qtyMatch[2].toLowerCase().replace(/s$/, '')
    result.rawQuantityText = qtyMatch[0]
  }

  for (const { pattern, offset } of DATE_PATTERNS) {
    const match = normalized.match(pattern)
    if (match) {
      if (offset !== null) {
        const d = new Date()
        d.setDate(d.getDate() + offset)
        result.date = d.toISOString().split('T')[0]
      } else {
        result.date = match[1]
      }
      break
    }
  }

  return result
}
