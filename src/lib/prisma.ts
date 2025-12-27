import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Retry middleware for Azure SQL Database serverless wake-up
// Handles connection timeouts when database is sleeping (shared/serverless tier)
prisma.$use(async (params, next) => {
  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await next(params);
    } catch (error: any) {
      // Check if it's a connection/timeout error (Azure SQL waking up)
      const isConnectionError =
        error.code === 'P1001' || // Can't reach database server
        error.code === 'P2024' || // Timed out fetching a new connection
        error.code === 'P1017' || // Server has closed the connection
        error.message?.toLowerCase().includes('timeout') ||
        error.message?.toLowerCase().includes('econnrefused') ||
        error.message?.toLowerCase().includes('connection');

      if (isConnectionError && retries < maxRetries - 1) {
        retries++;
        // Exponential backoff: 2s, 4s, 8s, 10s (max), 10s...
        const delay = Math.min(2000 * Math.pow(2, retries - 1), 10000);
        console.log(`🔄 Database connection retry ${retries}/${maxRetries} (waiting ${delay}ms)...`);
        console.log(`   Error: ${error.message || error.code}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Not a connection error or max retries reached
        if (isConnectionError) {
          console.error(`❌ Database connection failed after ${maxRetries} retries`);
        }
        throw error;
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Max retries exceeded');
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;