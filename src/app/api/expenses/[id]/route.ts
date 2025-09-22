import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ExpenseLine, ExpenseType } from '@/types';

async function getUserEmail(request: NextRequest): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Error('Unauthorized: No valid session');
  }
  return session.user.email;
}

async function updateReportTotal(reportId: string): Promise<void> {
  const expenses = await prisma.expenseLine.findMany({
    where: { report_id: reportId },
    select: { amount: true }
  });

  const total = expenses.reduce((sum, expense) =>
    sum + expense.amount.toNumber(), 0
  );

  await prisma.expenseReport.update({
    where: { id: reportId },
    data: {
      total_amount: total
      // Note: line_count field removed - not present in actual database schema
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🗄️ API /expenses/${params.id}: Fetching expense from Azure SQL`);

    const userEmail = await getUserEmail(request);

    const expense = await prisma.expenseLine.findFirst({
      where: {
        id: params.id,
        user_email: userEmail
      }
    });

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    const formattedExpense: ExpenseLine = {
      id: expense.id,
      reportId: expense.report_id,
      date: expense.date,
      type: expense.type as ExpenseType,
      description: expense.description,
      amount: expense.amount.toNumber(),
      currency: expense.currency,
      receiptId: expense.receipt_url || undefined,
      metadata: expense.metadata ? JSON.parse(expense.metadata) : undefined,
      createdAt: expense.created_at,
      updatedAt: expense.updated_at,
      ocrData: undefined
    };

    console.log(`✅ API /expenses/${params.id}: Found expense for ${userEmail}`);

    return NextResponse.json(formattedExpense);
  } catch (error) {
    console.error(`❌ API /expenses/${params.id} GET error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🗄️ API /expenses/${params.id}: Updating expense in Azure SQL`);

    const userEmail = await getUserEmail(request);
    const body = await request.json();

    // Check if expense belongs to user
    const existing = await prisma.expenseLine.findFirst({
      where: { id: params.id, user_email: userEmail }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.expenseLine.update({
      where: { id: params.id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        type: body.type,
        description: body.description,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
        currency: body.currency,
        receipt_url: body.receiptId,
        metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
        updated_at: new Date()
      }
    });

    // Update report total
    await updateReportTotal(updated.report_id);

    const formattedExpense: ExpenseLine = {
      id: updated.id,
      reportId: updated.report_id,
      date: updated.date,
      type: updated.type as ExpenseType,
      description: updated.description,
      amount: updated.amount.toNumber(),
      currency: updated.currency,
      receiptId: updated.receipt_url || undefined,
      metadata: updated.metadata ? JSON.parse(updated.metadata) : undefined,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      ocrData: undefined
    };

    console.log(`✅ API /expenses/${params.id}: Updated expense for ${userEmail}`);

    return NextResponse.json(formattedExpense);
  } catch (error) {
    console.error(`❌ API /expenses/${params.id} PUT error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🗄️ API /expenses/${params.id}: Deleting expense from Azure SQL`);

    const userEmail = await getUserEmail(request);

    const expense = await prisma.expenseLine.findFirst({
      where: { id: params.id, user_email: userEmail }
    });

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    await prisma.expenseLine.delete({
      where: { id: params.id }
    });

    // Update report total
    await updateReportTotal(expense.report_id);

    console.log(`✅ API /expenses/${params.id}: Deleted expense for ${userEmail}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`❌ API /expenses/${params.id} DELETE error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}