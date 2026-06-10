import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { requireSession } from '@/lib/auth'

export async function GET() {
  try {
    await requireSession()
    const settings = await prisma.appSettings.findUnique({
      where: { id: 'singleton' },
    })

    if (!settings) {
      return NextResponse.json({
        geminiApiKey: '',
        modelName: 'gemini-2.0-flash',
        temperature: 0.1,
        confidenceThreshold: 0.7,
      })
    }

    return NextResponse.json({
      geminiApiKey: settings.geminiApiKey ? '••••••••' : '',
      modelName: settings.modelName,
      temperature: settings.temperature,
      confidenceThreshold: settings.confidenceThreshold,
      hasKey: !!settings.geminiApiKey,
    })
  } catch (error) {
    console.error('/api/settings GET error:', error)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession()
    const body = await request.json()

    const { geminiApiKey, modelName, temperature, confidenceThreshold } = body as {
      geminiApiKey?: string
      modelName?: string
      temperature?: number
      confidenceThreshold?: number
    }

    const updateData: Record<string, unknown> = {}

    if (typeof modelName === 'string') updateData.modelName = modelName
    if (typeof temperature === 'number') updateData.temperature = Math.max(0, Math.min(1, temperature))
    if (typeof confidenceThreshold === 'number') updateData.confidenceThreshold = Math.max(0, Math.min(1, confidenceThreshold))

    if (typeof geminiApiKey === 'string') {
      if (geminiApiKey && !geminiApiKey.startsWith('••••')) {
        updateData.geminiApiKey = geminiApiKey
      }
    }

    const settings = await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      update: updateData,
      create: {
        id: 'singleton',
        modelName: modelName || 'gemini-2.0-flash',
        temperature: typeof temperature === 'number' ? Math.max(0, Math.min(1, temperature)) : 0.1,
        confidenceThreshold: typeof confidenceThreshold === 'number' ? Math.max(0, Math.min(1, confidenceThreshold)) : 0.7,
        geminiApiKey: typeof geminiApiKey === 'string' && geminiApiKey && !geminiApiKey.startsWith('••••') ? geminiApiKey : undefined,
      },
    })

    return NextResponse.json({
      geminiApiKey: settings.geminiApiKey ? '••••••••' : '',
      modelName: settings.modelName,
      temperature: settings.temperature,
      confidenceThreshold: settings.confidenceThreshold,
      hasKey: !!settings.geminiApiKey,
    })
  } catch (error) {
    console.error('/api/settings POST error:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
