import mongoose from "mongoose";
import OAuthToken from "../models/oauthTokenModel";
import type { IOAuthTokenDocument } from "../models/oauthTokenModel";

/**
 * Background service to automatically refresh access tokens before they expire
 * This runs periodically to ensure tokens are always fresh
 */
export class TokenRefreshService {
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_CHECK_INTERVAL = 5 * 60 * 1000; 

  /**
   * Start the token refresh service
   */
  start(): void {
    if (this.refreshInterval) {
      return; 
    }

    this.refreshInterval = setInterval(async () => {
      await this.refreshExpiringTokens();
    }, this.REFRESH_CHECK_INTERVAL);

    
    this.refreshExpiringTokens();
  }

  /**
   * Stop the token refresh service
   */
  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Find and refresh tokens that are about to expire
   */
  private async refreshExpiringTokens(): Promise<void> {
    try {
      
      if (mongoose.connection.readyState !== 1) {
        console.log("Database not connected, skipping token refresh");
        return;
      }

      
      const tokensToRefresh = await OAuthToken.find({
        isActive: true,
        accessTokenExpiresAt: {
          $lte: new Date(Date.now() + 5 * 60 * 1000), 
        },
        refreshTokenExpiresAt: {
          $gt: new Date(), 
        },
      });

      for (const token of tokensToRefresh) {
        try {
          await this.refreshSingleToken(token as IOAuthTokenDocument);
        } catch (error) {
          console.error(
            `Failed to refresh token for ${token.bet360Email} (${token.sportsbook}):`,
            error
          );
          
          token.isActive = false;
          await token.save();
        }
      }
    } catch (error) {
      console.error("Error in token refresh service:", error);
    }
  }

  /**
   * Refresh a single token
   */
  private async refreshSingleToken(token: IOAuthTokenDocument): Promise<void> {
    const BETWIZ_API_URL = process.env.BETWIZ_API_URL || "http:
    const WINNINGEDGE_API_URL = process.env.WINNINGEDGE_API_URL || "http:
    const BET360_CLIENT_ID = process.env.BET360_CLIENT_ID || "bet360_client_id";
    const BET360_CLIENT_SECRET = process.env.BET360_CLIENT_SECRET || "bet360_client_secret";

    const apiUrl = token.sportsbook === "betwiz" ? BETWIZ_API_URL : WINNINGEDGE_API_URL;
    const { refreshToken: decryptedRefreshToken } = token.getDecryptedTokens();

    const tokenResponse = await fetch(`${apiUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: decryptedRefreshToken,
        client_id: BET360_CLIENT_ID,
        client_secret: BET360_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token refresh failed: ${tokenResponse.status}`);
    }

    interface TokenResponse {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope?: string;
    }

    const tokenData = (await tokenResponse.json()) as TokenResponse;

    
    const accessTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    const refreshTokenExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); 

    token.setTokens(tokenData.access_token, tokenData.refresh_token);
    token.accessTokenExpiresAt = accessTokenExpiresAt;
    token.refreshTokenExpiresAt = refreshTokenExpiresAt;
    await token.save();
  }
}


export const tokenRefreshService = new TokenRefreshService();

