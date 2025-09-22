import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🔍 Testing environment variables...');

  const databaseUrl = process.env.DATABASE_URL;
  const useMock = process.env.USE_MOCK;

  // Hide sensitive parts of the connection string
  const maskedUrl = databaseUrl
    ? databaseUrl.replace(/password=([^;]+)/, 'password=***')
    : 'NOT SET';

  return NextResponse.json({
    success: true,
    environment: {
      DATABASE_URL: maskedUrl,
      USE_MOCK: useMock,
      NODE_ENV: process.env.NODE_ENV,
      databaseUrlPresent: !!databaseUrl,
      databaseUrlLength: databaseUrl?.length || 0
    },
    connectionStringParts: databaseUrl ? {
      isValidFormat: /^sqlserver:\/\//.test(databaseUrl),
      hasServer: databaseUrl.includes('.database.windows.net'),
      hasDatabase: databaseUrl.includes('database='),
      hasUser: databaseUrl.includes('user='),
      hasPassword: databaseUrl.includes('password='),
      hasEncrypt: databaseUrl.includes('encrypt=true')
    } : null
  });
}