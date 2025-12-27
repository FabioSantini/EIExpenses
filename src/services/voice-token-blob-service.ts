/**
 * Voice Token Blob Storage Service
 * Manages temporary tokens for voicebot authentication using Azure Blob Storage
 * Tokens expire after 15 minutes
 */

import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

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
  token: string;
  userId: string;
  userEmail: string;
  expiresAt: string;
  createdAt: string;
}

class VoiceTokenBlobService {
  private blobServiceClient: BlobServiceClient | null = null;
  private containerClient: ContainerClient | null = null;
  private containerName = 'voice-tokens';

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

      if (!connectionString) {
        console.warn('⚠️ Voice Token Blob Service: Azure Storage not configured');
        return;
      }

      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);

      // Ensure container exists
      await this.containerClient.createIfNotExists();

      console.log('✅ Voice Token Blob Service initialized');
    } catch (error) {
      console.error('❌ Voice Token Blob Service initialization failed:', error);
    }
  }

  private async ensureInitialized(): Promise<ContainerClient> {
    if (!this.containerClient) {
      await this.initialize();
    }
    if (!this.containerClient) {
      throw new Error('Voice Token Blob Service not available');
    }
    return this.containerClient;
  }

  /**
   * Generate a new voice token for a user
   * Invalidates any existing token for this user
   */
  async generateVoiceToken(userId: string, userEmail: string): Promise<{
    token: string;
    expiresAt: Date;
    validForMinutes: number;
  }> {
    const container = await this.ensureInitialized();

    // Remove any existing token for this user
    await this.invalidateUserToken(userId);

    // Clean up expired tokens
    await this.cleanupExpiredTokens();

    // Get currently used tokens
    const usedTokens = new Set<string>();
    for await (const blob of container.listBlobsFlat()) {
      // Extract token from blob name (format: {token}.json)
      const token = blob.name.replace('.json', '');
      usedTokens.add(token);
    }

    // Pick a random word that's not currently in use
    let token: string;
    let attempts = 0;
    do {
      const randomIndex = Math.floor(Math.random() * ITALIAN_WORDS.length);
      token = ITALIAN_WORDS[randomIndex];
      attempts++;
      if (attempts > ITALIAN_WORDS.length) {
        break; // All words in use, just use any word
      }
    } while (usedTokens.has(token));

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_VALIDITY_MS);

    // Store token as JSON blob
    const tokenData: TokenData = {
      token,
      userId,
      userEmail,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    };

    const blobClient = container.getBlockBlobClient(`${token}.json`);
    await blobClient.upload(
      JSON.stringify(tokenData),
      JSON.stringify(tokenData).length,
      {
        blobHTTPHeaders: { blobContentType: 'application/json' }
      }
    );

    console.log(`🎤 Voice token generated for user ${userEmail}: "${token}" (expires at ${expiresAt.toLocaleTimeString()})`);

    return {
      token,
      expiresAt,
      validForMinutes: 15,
    };
  }

  /**
   * Validate a voice token and return the associated user info
   * Returns null if token is invalid or expired
   */
  async validateVoiceToken(token: string): Promise<{
    userId: string;
    userEmail: string;
  } | null> {
    if (!token) {
      console.log('🎤 Voice token validation failed: empty token');
      return null;
    }

    try {
      const container = await this.ensureInitialized();
      const normalizedToken = token.toLowerCase().trim();
      const blobClient = container.getBlockBlobClient(`${normalizedToken}.json`);

      // Check if blob exists
      const exists = await blobClient.exists();
      if (!exists) {
        console.log(`🎤 Voice token validation failed: token "${token}" not found`);
        return null;
      }

      // Download and parse token data
      const downloadResponse = await blobClient.download();
      const content = await this.streamToString(downloadResponse.readableStreamBody!);
      const tokenData: TokenData = JSON.parse(content);

      // Check if expired
      if (new Date() > new Date(tokenData.expiresAt)) {
        console.log(`🎤 Voice token validation failed: token "${token}" expired`);
        // Delete expired token
        await blobClient.delete();
        return null;
      }

      console.log(`🎤 Voice token validated for user ${tokenData.userEmail}`);
      return {
        userId: tokenData.userId,
        userEmail: tokenData.userEmail,
      };
    } catch (error) {
      console.error('🎤 Voice token validation error:', error);
      return null;
    }
  }

  /**
   * Get the current active token for a user (if any)
   */
  async getActiveTokenForUser(userId: string): Promise<{
    token: string;
    expiresAt: Date;
    remainingSeconds: number;
  } | null> {
    try {
      const container = await this.ensureInitialized();

      // Search through all tokens to find user's token
      for await (const blob of container.listBlobsFlat()) {
        const blobClient = container.getBlockBlobClient(blob.name);
        const downloadResponse = await blobClient.download();
        const content = await this.streamToString(downloadResponse.readableStreamBody!);
        const tokenData: TokenData = JSON.parse(content);

        if (tokenData.userId === userId) {
          const now = new Date();
          const expiresAt = new Date(tokenData.expiresAt);

          if (now > expiresAt) {
            // Token expired, delete it
            await blobClient.delete();
            return null;
          }

          const remainingSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
          return {
            token: tokenData.token,
            expiresAt,
            remainingSeconds,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('🎤 Error getting active token:', error);
      return null;
    }
  }

  /**
   * Invalidate a user's token
   */
  async invalidateUserToken(userId: string): Promise<boolean> {
    try {
      const container = await this.ensureInitialized();

      // Search through all tokens to find and delete user's token
      for await (const blob of container.listBlobsFlat()) {
        const blobClient = container.getBlockBlobClient(blob.name);
        const downloadResponse = await blobClient.download();
        const content = await this.streamToString(downloadResponse.readableStreamBody!);
        const tokenData: TokenData = JSON.parse(content);

        if (tokenData.userId === userId) {
          await blobClient.delete();
          console.log(`🎤 Voice token invalidated for user ${tokenData.userEmail}`);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('🎤 Error invalidating token:', error);
      return false;
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const container = await this.ensureInitialized();
      const now = new Date();
      let cleaned = 0;

      for await (const blob of container.listBlobsFlat()) {
        const blobClient = container.getBlockBlobClient(blob.name);
        try {
          const downloadResponse = await blobClient.download();
          const content = await this.streamToString(downloadResponse.readableStreamBody!);
          const tokenData: TokenData = JSON.parse(content);

          if (now > new Date(tokenData.expiresAt)) {
            await blobClient.delete();
            cleaned++;
          }
        } catch {
          // If we can't read/parse the blob, delete it
          await blobClient.delete();
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🎤 Cleaned up ${cleaned} expired voice tokens`);
      }
    } catch (error) {
      console.error('🎤 Error cleaning up tokens:', error);
    }
  }

  /**
   * Helper to convert stream to string
   */
  private async streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return !!this.containerClient;
  }
}

// Export singleton instance
export const voiceTokenBlobService = new VoiceTokenBlobService();
