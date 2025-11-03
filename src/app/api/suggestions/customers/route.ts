import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';

/**
 * GET /api/suggestions/customers
 * Get customer name suggestions for autocomplete
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    console.log(`🗄️ API /suggestions/customers: Getting suggestions for query "${query}"`);

    // TODO: Implement database query to get customer suggestions
    // For now, return empty array to prevent infinite loops
    const suggestions: string[] = [];

    console.log(`✅ API /suggestions/customers: Returned ${suggestions.length} suggestions`);
    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('❌ API /suggestions/customers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer suggestions' },
      { status: 500 }
    );
  }
}