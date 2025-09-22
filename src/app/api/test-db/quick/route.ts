import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  console.log('🔍 Quick connection test...');

  try {
    // Simple quick test
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const endTime = Date.now();

    return NextResponse.json({
      success: true,
      message: 'Quick connection successful!',
      responseTime: `${endTime - startTime}ms`
    });
  } catch (error: any) {
    console.error('❌ Quick test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: error.constructor.name
    }, { status: 500 });
  }
}