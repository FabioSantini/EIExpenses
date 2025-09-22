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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');

    if (!reportId) {
      return NextResponse.json(
        { error: 'Missing reportId parameter' },
        { status: 400 }
      );
    }

    console.log(`🗄️ API /expenses: Fetching expenses for report ${reportId} from Azure SQL`);

    const userEmail = await getUserEmail(request);

    const expenses = await prisma.expenseLine.findMany({
      where: {
        report_id: reportId,
        user_email: userEmail
      },
      orderBy: { date: 'desc' }
    });

    const formattedExpenses: ExpenseLine[] = expenses.map(expense => ({
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
    }));

    console.log(`✅ API /expenses: Found ${formattedExpenses.length} expenses for report ${reportId}`);

    return NextResponse.json(formattedExpenses);
  } catch (error) {
    console.error('❌ API /expenses GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🗄️ API /expenses: Creating new expense line');

    const userEmail = await getUserEmail(request);
    const body = await request.json();

    const { reportId, date, type, description, amount, currency, receiptId, metadata } = body;

    if (!reportId || !date || !type || !description || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: reportId, date, type, description, amount' },
        { status: 400 }
      );
    }

    const expense = await prisma.expenseLine.create({
      data: {
        report_id: reportId,
        user_email: userEmail,
        date: new Date(date),
        type,
        description,
        amount: parseFloat(amount),
        currency: currency || 'EUR',
        receipt_url: receiptId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ocr_processed: false
      }
    });

    // Update report total
    await updateReportTotal(reportId);

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

    console.log(`✅ API /expenses: Created expense ${expense.id} for ${userEmail}`);

    return NextResponse.json(formattedExpense, { status: 201 });
  } catch (error) {
    console.error('❌ API /expenses POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}