import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ExpenseReport } from '@/types';

async function getUserEmail(request: NextRequest): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Error('Unauthorized: No valid session');
  }
  return session.user.email;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🗄️ API /reports: Fetching expense reports from Azure SQL');

    const userEmail = await getUserEmail(request);

    const reports = await prisma.expenseReport.findMany({
      where: { user_email: userEmail },
      include: {
        expense_lines: true
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    const formattedReports: ExpenseReport[] = reports.map(report => ({
      id: report.id,
      title: report.title,
      month: report.month,
      year: report.year,
      description: report.description || '',
      status: report.status as 'draft' | 'submitted' | 'approved',
      totalAmount: report.total_amount.toNumber(),
      lineCount: report.expense_lines.length,
      createdAt: report.created_at,
      updatedAt: report.updated_at
    }));

    console.log(`✅ API /reports: Found ${formattedReports.length} reports for ${userEmail}`);

    return NextResponse.json(formattedReports);
  } catch (error) {
    console.error('❌ API /reports error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🗄️ API /reports: Creating new expense report');

    const userEmail = await getUserEmail(request);
    const body = await request.json();

    const { title, month, year, description } = body;

    if (!title || !month || !year) {
      return NextResponse.json(
        { error: 'Missing required fields: title, month, year' },
        { status: 400 }
      );
    }

    // Always create a new report (users can have multiple reports per month/year)
    const report = await prisma.expenseReport.create({
      data: {
        user_email: userEmail,
        user_name: 'User', // TODO: Get from session
        title,
        month: parseInt(month),
        year: parseInt(year),
        description: description || '',
        status: 'draft',
        total_amount: 0
      }
    });
    console.log(`✅ API /reports: Created new report ${report.id} for ${userEmail} (${month}/${year}) with title "${title}"`);

    const formattedReport: ExpenseReport = {
      id: report.id,
      title: report.title,
      month: report.month,
      year: report.year,
      description: report.description || '',
      status: report.status as 'draft' | 'submitted' | 'approved',
      totalAmount: 0,
      lineCount: 0,
      createdAt: report.created_at,
      updatedAt: report.updated_at
    };

    console.log(`✅ API /reports: Created report ${report.id} for ${userEmail}`);

    return NextResponse.json(formattedReport, { status: 201 });
  } catch (error) {
    console.error('❌ API /reports POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}