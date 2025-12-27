import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { voiceTokenBlobService } from '@/services/voice-token-blob-service';

/**
 * POST /api/voice/token
 * Generate a new voice token for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in first' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    const userId = userEmail; // Use email as unique identifier

    // Generate new token (this will invalidate any existing token)
    const tokenData = await voiceTokenBlobService.generateVoiceToken(userId, userEmail);

    return NextResponse.json({
      success: true,
      token: tokenData.token.toUpperCase(), // Return uppercase for display
      expiresAt: tokenData.expiresAt.toISOString(),
      validForMinutes: tokenData.validForMinutes,
      message: `Token valido per ${tokenData.validForMinutes} minuti`
    });

  } catch (error) {
    console.error('Error generating voice token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voice/token
 * Get the current active token for the authenticated user (if any)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in first' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    const activeToken = await voiceTokenBlobService.getActiveTokenForUser(userId);

    if (!activeToken) {
      return NextResponse.json({
        success: true,
        hasActiveToken: false,
        token: null
      });
    }

    return NextResponse.json({
      success: true,
      hasActiveToken: true,
      token: activeToken.token.toUpperCase(),
      expiresAt: activeToken.expiresAt.toISOString(),
      remainingSeconds: activeToken.remainingSeconds
    });

  } catch (error) {
    console.error('Error getting voice token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get token status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voice/token
 * Invalidate the current token for the authenticated user
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in first' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    const wasInvalidated = await voiceTokenBlobService.invalidateUserToken(userId);

    return NextResponse.json({
      success: true,
      wasInvalidated,
      message: wasInvalidated ? 'Token invalidato' : 'Nessun token attivo da invalidare'
    });

  } catch (error) {
    console.error('Error invalidating voice token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to invalidate token' },
      { status: 500 }
    );
  }
}
