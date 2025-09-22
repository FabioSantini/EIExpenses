import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  console.log('🔍 Testing Prisma connection (same as app)...');

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return NextResponse.json({
      success: false,
      error: 'DATABASE_URL not found in environment variables'
    }, { status: 500 });
  }

  // Parse the connection string to show info
  const match = connectionString.match(/sqlserver:\/\/([^.]+)\.database\.windows\.net:(\d+);database=([^;]+);user=([^;]+);password=([^;]+)/);

  if (!match) {
    return NextResponse.json({
      success: false,
      error: 'Invalid DATABASE_URL format',
      url: connectionString.substring(0, 50) + '...'
    }, { status: 500 });
  }

  const [, server, port, database, user] = match;

  try {
    console.log('📡 Testing Prisma connection to:', `${server}.database.windows.net`);

    // Test basic connection
    const startTime = Date.now();
    const result = await prisma.$queryRaw`SELECT 1 as test, GETDATE() as currentTime`;
    const responseTime = Date.now() - startTime;

    // Test specific tables that the app uses
    const reportCount = await prisma.expenseReport.count();
    const expenseLineCount = await prisma.expenseLine.count();

    return NextResponse.json({
      success: true,
      message: 'Prisma connection successful!',
      server: `${server}.database.windows.net`,
      database: database,
      user: user,
      responseTime: `${responseTime}ms`,
      testQuery: result,
      tableData: {
        expenseReports: reportCount,
        expenseLines: expenseLineCount
      }
    });
  } catch (error: any) {
    console.error('❌ Prisma connection error:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      errorCode: error.code || error.errorCode,
      server: `${server}.database.windows.net`,
      database: database,
      clientVersion: error.clientVersion,
      suggestion: error.message?.includes("Can't reach database server")
        ? 'Check Azure SQL server firewall rules and ensure the server is running'
        : 'Check connection string format and credentials'
    }, { status: 500 });
  }
}