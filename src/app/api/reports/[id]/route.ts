import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ExpenseReport } from '@/types';

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';

async function getUserEmail(request: NextRequest): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Error('Unauthorized: No valid session');
  }
  return session.user.email;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🗄️ API /reports/${params.id}: Fetching report from Azure SQL`);

    const userEmail = await getUserEmail(request);

    const report = await prisma.expenseReport.findFirst({
      where: {
        id: params.id,
        user_email: userEmail
      },
      include: {
        expense_lines: true
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const formattedReport: ExpenseReport = {
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
    };

    console.log(`✅ API /reports/${params.id}: Found report for ${userEmail}`);

    return NextResponse.json(formattedReport);
  } catch (error) {
    console.error(`❌ API /reports/${params.id} GET error:`, error);
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
    console.log(`🗄️ API /reports/${params.id}: Updating report in Azure SQL`);

    const userEmail = await getUserEmail(request);
    const body = await request.json();

    // First check if report belongs to user
    const existing = await prisma.expenseReport.findFirst({
      where: { id: params.id, user_email: userEmail }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.expenseReport.update({
      where: { id: params.id },
      data: {
        title: body.title,
        description: body.description,
        status: body.status,
        updated_at: new Date()
      },
      include: {
        expense_lines: true
      }
    });

    const formattedReport: ExpenseReport = {
      id: updated.id,
      title: updated.title,
      month: updated.month,
      year: updated.year,
      description: updated.description || '',
      status: updated.status as 'draft' | 'submitted' | 'approved',
      totalAmount: updated.total_amount.toNumber(),
      lineCount: updated.expense_lines.length,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
    };

    console.log(`✅ API /reports/${params.id}: Updated report for ${userEmail}`);

    return NextResponse.json(formattedReport);
  } catch (error) {
    console.error(`❌ API /reports/${params.id} PUT error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🗄️ API /reports/${params.id}: Updating report status in Azure SQL`);

    const userEmail = await getUserEmail(request);
    const body = await request.json();

    // Validate request body
    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses = ['draft', 'submitted', 'approved', 'rejected'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // First check if report belongs to user
    const existing = await prisma.expenseReport.findFirst({
      where: { id: params.id, user_email: userEmail }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Update only the status and updated_at timestamp
    const updated = await prisma.expenseReport.update({
      where: { id: params.id },
      data: {
        status: body.status,
        updated_at: new Date()
      },
      include: {
        expense_lines: true
      }
    });

    const formattedReport: ExpenseReport = {
      id: updated.id,
      title: updated.title,
      month: updated.month,
      year: updated.year,
      description: updated.description || '',
      status: updated.status as 'draft' | 'submitted' | 'approved' | 'rejected',
      totalAmount: updated.total_amount.toNumber(),
      lineCount: updated.expense_lines.length,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
    };

    console.log(`✅ API /reports/${params.id}: Updated status to '${body.status}' for ${userEmail}`);

    return NextResponse.json(formattedReport);
  } catch (error) {
    console.error(`❌ API /reports/${params.id} PATCH error:`, error);
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
    console.log(`🗄️ API /reports/${params.id}: Deleting report and all related data`);

    const userEmail = await getUserEmail(request);

    // First, verify the report exists and belongs to the user
    const report = await prisma.expenseReport.findFirst({
      where: { id: params.id, user_email: userEmail },
      include: { expense_lines: true }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Collect all receipt URLs for Azure Storage cleanup
    const receiptUrls = report.expense_lines
      .map(line => line.receipt_url)
      .filter(url => url && url.trim() !== '') as string[];

    console.log(`🗄️ Found ${receiptUrls.length} receipts to delete from Azure Storage`);

    // Delete receipt images from Azure Storage
    if (receiptUrls.length > 0) {
      try {
        const { azureStorageServerService } = await import('@/services/azure-storage-server');

        for (const receiptUrl of receiptUrls) {
          try {
            await azureStorageServerService.deleteReceipt(receiptUrl);
            console.log(`✅ Deleted receipt from Azure Storage: ${receiptUrl}`);
          } catch (storageError) {
            console.warn(`⚠️ Failed to delete receipt from Azure Storage: ${receiptUrl}`, storageError);
            // Continue with other deletions even if one fails
          }
        }
      } catch (storageImportError) {
        console.warn(`⚠️ Azure Storage service not available, skipping receipt cleanup:`, storageImportError);
      }
    }

    // Delete the expense report (this will cascade delete all expense lines due to onDelete: Cascade in schema)
    await prisma.expenseReport.delete({
      where: { id: params.id }
    });

    console.log(`✅ API /reports/${params.id}: Deleted report, ${report.expense_lines.length} expense lines, and ${receiptUrls.length} receipts for ${userEmail}`);

    return NextResponse.json({
      success: true,
      deletedLinesCount: report.expense_lines.length,
      deletedReceiptsCount: receiptUrls.length
    });
  } catch (error) {
    console.error(`❌ API /reports/${params.id} DELETE error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}