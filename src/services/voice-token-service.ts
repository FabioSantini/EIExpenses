/**
 * Voice Token Service
 * Manages temporary tokens for voicebot authentication
 * Tokens are stored in memory and expire after 15 minutes
 */

// 50 simple Italian words for tokens
const ITALIAN_WORDS = [
  'mela', 'pera', 'casa', 'sole', 'luna',
  'mare', 'lago', 'rosa', 'verde', 'rosso',
  'giallo', 'blu', 'nero', 'bianco', 'tavolo',
  'sedia', 'porta', 'libro', 'penna', 'carta',
  'acqua', 'fuoco', 'terra', 'vento', 'pioggia',
  'neve', 'stella', 'nuvola', 'fiore', 'albero',
  'gatto', 'cane', 'uccello', 'pesce', 'cavallo',
  'pizza', 'pasta', 'pane', 'vino', 'caffe',
  'treno', 'aereo', 'auto', 'bici', 'nave',
  'ponte', 'torre', 'chiesa', 'piazza', 'fiume'
];

// Token validity duration in milliseconds (15 minutes)
const TOKEN_VALIDITY_MS = 15 * 60 * 1000;

interface TokenData {
  userId: string;
  userEmail: string;
  expiresAt: Date;
  createdAt: Date;
}

// In-memory token storage: Map<token (lowercase), TokenData>
const tokenStore = new Map<string, TokenData>();

/**
 * Generate a new voice token for a user
 * Invalidates any existing token for this user
 */
export function generateVoiceToken(userId: string, userEmail: string): {
  token: string;
  expiresAt: Date;
  validForMinutes: number;
} {
  // Remove any existing token for this user
  for (const [existingToken, data] of tokenStore.entries()) {
    if (data.userId === userId) {
      tokenStore.delete(existingToken);
      break;
    }
  }

  // Clean up expired tokens
  cleanupExpiredTokens();

  // Pick a random word that's not currently in use
  let token: string;
  let attempts = 0;
  do {
    const randomIndex = Math.floor(Math.random() * ITALIAN_WORDS.length);
    token = ITALIAN_WORDS[randomIndex];
    attempts++;
    // If all words are in use (unlikely), just use any word
    if (attempts > ITALIAN_WORDS.length) {
      break;
    }
  } while (tokenStore.has(token.toLowerCase()));

  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_VALIDITY_MS);

  // Store token (lowercase for case-insensitive comparison)
  tokenStore.set(token.toLowerCase(), {
    userId,
    userEmail,
    expiresAt,
    createdAt: now,
  });

  console.log(`🎤 Voice token generated for user ${userEmail}: "${token}" (expires at ${expiresAt.toLocaleTimeString()})`);

  return {
    token,
    expiresAt,
    validForMinutes: 15,
  };
}

/**
 * Validate a voice token and return the associated user ID
 * Returns null if token is invalid or expired
 */
export function validateVoiceToken(token: string): {
  userId: string;
  userEmail: string;
} | null {
  if (!token) {
    console.log('🎤 Voice token validation failed: empty token');
    return null;
  }

  const normalizedToken = token.toLowerCase().trim();
  const tokenData = tokenStore.get(normalizedToken);

  if (!tokenData) {
    console.log(`🎤 Voice token validation failed: token "${token}" not found`);
    return null;
  }

  // Check if expired
  if (new Date() > tokenData.expiresAt) {
    console.log(`🎤 Voice token validation failed: token "${token}" expired`);
    tokenStore.delete(normalizedToken);
    return null;
  }

  console.log(`🎤 Voice token validated for user ${tokenData.userEmail}`);
  return {
    userId: tokenData.userId,
    userEmail: tokenData.userEmail,
  };
}

/**
 * Get the current active token for a user (if any)
 */
export function getActiveTokenForUser(userId: string): {
  token: string;
  expiresAt: Date;
  remainingSeconds: number;
} | null {
  for (const [token, data] of tokenStore.entries()) {
    if (data.userId === userId) {
      const now = new Date();
      if (now > data.expiresAt) {
        tokenStore.delete(token);
        return null;
      }
      const remainingSeconds = Math.floor((data.expiresAt.getTime() - now.getTime()) / 1000);
      return {
        token,
        expiresAt: data.expiresAt,
        remainingSeconds,
      };
    }
  }
  return null;
}

/**
 * Invalidate a user's token
 */
export function invalidateUserToken(userId: string): boolean {
  for (const [token, data] of tokenStore.entries()) {
    if (data.userId === userId) {
      tokenStore.delete(token);
      console.log(`🎤 Voice token invalidated for user ${data.userEmail}`);
      return true;
    }
  }
  return false;
}

/**
 * Clean up expired tokens from memory
 */
function cleanupExpiredTokens(): void {
  const now = new Date();
  let cleaned = 0;
  for (const [token, data] of tokenStore.entries()) {
    if (now > data.expiresAt) {
      tokenStore.delete(token);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🎤 Cleaned up ${cleaned} expired voice tokens`);
  }
}

/**
 * Get statistics about current token usage (for debugging)
 */
export function getTokenStats(): {
  activeTokens: number;
  words: string[];
} {
  cleanupExpiredTokens();
  return {
    activeTokens: tokenStore.size,
    words: ITALIAN_WORDS,
  };
}
