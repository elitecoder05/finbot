import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { requireSession } from '@/lib/auth'
import { getApprovalPermissionRules, isApprovalAllowed } from '@/lib/rbac'
import type { TransactionType } from '@/types'

export async function GET(request: Request) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const createdBy = searchParams.get('createdBy')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const where: Record<string, unknown> = {}

    if (status && ['draft', 'pending', 'approved', 'rejected'].includes(status)) {
      where.status = status
    }
    if (createdBy) {
      where.createdById = createdBy
    }

    const transactions = await prisma.transaction.findMany({
      where,
      take: Math.min(limit, 100),
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
      },
    })

    const enriched = transactions.map((tx) => ({
      ...tx,
      canApprove: isApprovalAllowed(tx.createdBy.role, session.role) && tx.status === 'pending',
    }))

    return NextResponse.json({ transactions: enriched })
  } catch (error) {
    console.error('/api/transactions GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession()
    const body = await request.json()

    const {
      transactionType,
      amount,
      product,
      person,
      quantity,
      unit,
      notes,
      date,
    } = body as {
      transactionType?: string
      amount?: number
      product?: string | null
      person?: string | null
      quantity?: number | null
      unit?: string | null
      notes?: string | null
      date?: string | null
    }

    if (!transactionType || amount === undefined || amount === null || amount <= 0) {
      return NextResponse.json({ error: 'transactionType and a positive amount are required' }, { status: 400 })
    }

    const allowedApprovers = getApprovalPermissionRules(session.role)

    const parsedDate = date ? new Date(date) : new Date()
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }

    const transaction = await prisma.transaction.create({
      data: {
        transactionType: transactionType as TransactionType,
        amount,
        product: product ?? '',
        person: person ?? null,
        quantity: quantity ?? null,
        unit: unit ?? null,
        notes: notes ?? null,
        date: parsedDate,
        confidence: 1,
        status: 'pending',
        createdById: session.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    })

    if (allowedApprovers.length > 0) {
      await prisma.approval.create({
        data: {
          transactionId: transaction.id,
          approverId: transaction.createdById,
          action: 'created',
          comment: 'Transaction created, awaiting approval',
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        action: 'transaction_created',
        entity: 'Transaction',
        entityId: transaction.id,
        details: JSON.stringify({ transactionType, amount }),
        userId: session.userId,
      },
    })

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    console.error('/api/transactions POST error:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
