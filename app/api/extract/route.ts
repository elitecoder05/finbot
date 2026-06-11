import { NextResponse } from 'next/server'
import { extractTransaction } from '@/lib/extraction'
import { requireSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const { text } = body as { text?: string }

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Input text is required' }, { status: 400 })
    }

    const result = await extractTransaction(text)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Extraction failed', details: result.validation },
        { status: 422 }
      )
    }

    return NextResponse.json({
      extraction: result.extraction,
      validation: {
        isValid: result.validation?.isValid ?? true,
        requiresUserConfirmation: result.validation?.requiresUserConfirmation ?? true,
        warnings: result.validation?.warnings ?? [],
        errors: result.validation?.errors ?? [],
        confidence: result.validation?.confidence ?? result.extraction?.confidence ?? 0,
      },
      modelUsed: process.env.AI_MODEL || 'gemini-2.0-flash',
    })
  } catch (error) {
    console.error('/api/extract error:', error)
    return NextResponse.json({ error: 'Extraction service error' }, { status: 500 })
  }
}
