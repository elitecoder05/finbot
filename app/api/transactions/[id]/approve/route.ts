import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { requireSession } from '@/lib/auth'
import { isApprovalAllowed } from '@/lib/rbac'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession()
    const { id } = params

    const body = await request.json().catch(() => ({}))
    const { action, comment } = body as { action?: string; comment?: string }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { createdBy: true },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (transaction.status !== 'pending') {
      return NextResponse.json({ error: 'Transaction is not pending' }, { status: 409 })
    }

    const approver = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true },
    })

    if (!approver || !isApprovalAllowed(transaction.createdBy.role, approver.role)) {
      return NextResponse.json({ error: 'Not authorized to approve this transaction' }, { status: 403 })
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        approvedById: session.userId,
        approvedAt: new Date(),
        isRejected: action === 'reject',
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
      },
    })

    await prisma.approval.create({
      data: {
        transactionId: id,
        approverId: session.userId,
        action: action === 'approve' ? 'approved' : 'rejected',
        comment: comment || null,
      },
    })

    await prisma.auditLog.create({
      data: {
        action: `transaction_${action === 'approve' ? 'approved' : 'rejected'}`,
        entity: 'Transaction',
        entityId: id,
        details: JSON.stringify({ action, comment }),
        userId: session.userId,
      },
    })

    return NextResponse.json({ transaction: updatedTransaction })
  } catch (error) {
    console.error('/api/transactions/[id]/approve error:', error)
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 })
  }
}
