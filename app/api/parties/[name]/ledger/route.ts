import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { requireSession } from '@/lib/auth'

// GET /api/parties/[name]/ledger - get full ledger for a person
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await requireSession()
    const { name } = await params
    const decodedName = decodeURIComponent(name)

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || 'all'

    let dateFilter = {}
    if (range !== 'all') {
      const now = new Date()
      let startDate: Date
      if (range === '7d') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      else if (range === '30d') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      else if (range === '90d') startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      else if (range === '1y') startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      else startDate = new Date(0)
      dateFilter = { date: { gte: startDate } }
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        person: decodedName,
        ...dateFilter,
      },
      orderBy: { date: 'asc' },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
      },
    })

    // Calculate running balance and summary
    // For purchases: user bought FROM the person → user owes person (positive = person owes user, negative = user owes person)
    // For payments: user paid TO the person → reduces what user owes
    let balance = 0
    const ledgerEntries = transactions.map((tx) => {
      let credit = 0 // money flowing TO user (person owes user)
      let debit = 0  // money flowing FROM user (user owes person)

      if (tx.transactionType === 'purchase') {
        // User bought from this person → user owes them
        debit = tx.amount
        balance -= tx.amount
      } else if (tx.transactionType === 'payment') {
        // User paid this person → reduces debt
        credit = tx.amount
        balance += tx.amount
      }

      return {
        id: tx.id,
        date: tx.date,
        transactionType: tx.transactionType,
        amount: tx.amount,
        product: tx.product,
        quantity: tx.quantity,
        unit: tx.unit,
        notes: tx.notes,
        status: tx.status,
        credit,
        debit,
        balance,
        createdBy: tx.createdBy,
        approvedBy: tx.approvedBy,
      }
    })

    const summary = {
      totalPurchases: transactions
        .filter((t) => t.transactionType === 'purchase')
        .reduce((sum, t) => sum + t.amount, 0),
      totalPayments: transactions
        .filter((t) => t.transactionType === 'payment')
        .reduce((sum, t) => sum + t.amount, 0),
      transactionCount: transactions.length,
      finalBalance: balance,
      // If balance > 0: person owes user money
      // If balance < 0: user owes person money
    }

    return NextResponse.json({
      person: decodedName,
      transactions: ledgerEntries,
      summary,
    })
  } catch (error) {
    console.error('/api/parties/[name]/ledger GET error:', error)
    return NextResponse.json({ error: 'Failed to load ledger' }, { status: 500 })
  }
}
