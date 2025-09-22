import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  console.log('🔍 Testing Prisma client connection...');

  try {
    // Test connection with a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;

    // Try to get database version
    const version = await prisma.$queryRaw`SELECT @@VERSION as version`;

    // Count tables
    const tables = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
    `;

    return NextResponse.json({
      success: true,
      message: 'Prisma connection successful!',
      testQuery: result,
      dbVersion: version,
      tableCount: tables
    });
  } catch (error: any) {
    console.error('❌ Prisma connection error:', error);

    // Check if it's a connection error
    if (error.message?.includes("Can't reach database server")) {
      const server = error.message.match(/at `([^`]+)`/)?.[1];
      return NextResponse.json({
        success: false,
        error: 'Cannot reach database server',
        server: server || 'unknown',
        fullError: error.message,
        errorCode: error.errorCode || error.code,
        suggestion: 'Check if the server is accessible and firewall rules allow connection'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: false,
      error: error.message,
      errorCode: error.errorCode || error.code,
      clientVersion: error.clientVersion
    }, { status: 500 });
  }
}