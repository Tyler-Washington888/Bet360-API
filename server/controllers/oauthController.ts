import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import OAuthToken from "../models/oauthTokenModel";
import {
  TokenExchangeRequest,
  TokenExchangeResponse,
  OAuthTokenStatus,
} from "../interfaces/oauth";
import { AuthenticatedRequest } from "../interfaces/user";

const BETWIZ_API_URL = process.env.BETWIZ_API_URL || "http://localhost:5001";
const WINNINGEDGE_API_URL = process.env.WINNINGEDGE_API_URL || "http://localhost:5002";
const BET360_CLIENT_ID = process.env.BET360_CLIENT_ID || "bet360_client_id";
const BET360_CLIENT_SECRET = process.env.BET360_CLIENT_SECRET || "bet360_client_secret";




const exchangeToken = asyncHandler(
  async (req: Request, res: Response<TokenExchangeResponse>) => {
    const typedReq = req as AuthenticatedRequest;
    const { code, codeVerifier, state, sportsbook }: TokenExchangeRequest = req.body;

    if (!code || !codeVerifier || !sportsbook) {
      res.status(400);
      throw new Error("Missing required fields: code, codeVerifier, sportsbook");
    }

    if (!["betwiz", "winningedge"].includes(sportsbook)) {
      res.status(400);
      throw new Error("Invalid sportsbook");
    }

    
    const apiUrl = sportsbook === "betwiz" ? BETWIZ_API_URL : WINNINGEDGE_API_URL;
    const redirectUri = `${process.env.BET360_UI_URL || "http://localhost:5173"}/oauth/callback`;

    
    try {
      const tokenResponse = await fetch(`${apiUrl}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: BET360_CLIENT_ID,
          client_secret: BET360_CLIENT_SECRET,
          code_verifier: codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = (await tokenResponse.json()) as { error?: string; error_description?: string };
        res.status(tokenResponse.status);
        throw new Error(errorData.error || "Failed to exchange authorization code");
      }

      interface SportsbookTokenResponse {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        scope?: string;
        user_id?: string; 
      }

      const tokenData = (await tokenResponse.json()) as SportsbookTokenResponse;

      
      const accessTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      const refreshTokenExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); 

      
      const existingToken = await OAuthToken.findOne({
        bet360Email: typedReq.user.email,
        sportsbook,
      });

      if (existingToken) {
        existingToken.setTokens(tokenData.access_token, tokenData.refresh_token);
        existingToken.accessTokenExpiresAt = accessTokenExpiresAt;
        existingToken.refreshTokenExpiresAt = refreshTokenExpiresAt;
        existingToken.scope = tokenData.scope ? tokenData.scope.split(" ") : [];
        existingToken.isActive = true;
        
        if (tokenData.user_id) {
          existingToken.sportsbookUserId = tokenData.user_id;
        }
        await existingToken.save();
      } else {
        const newToken = new OAuthToken({
          bet360Email: typedReq.user.email,
          sportsbook,
          sportsbookUserId: tokenData.user_id, 
          accessToken: "", 
          refreshToken: "", 
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
          scope: tokenData.scope ? tokenData.scope.split(" ") : [],
          isActive: true,
        });
        newToken.setTokens(tokenData.access_token, tokenData.refresh_token);
        await newToken.save();
      }

      
      if (tokenData.user_id) {
        try {
          
          const subscribeResponse = await fetch(`${apiUrl}/api/users/${tokenData.user_id}/subscribe`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${tokenData.access_token}`, 
            },
            body: JSON.stringify({
              bet360Email: typedReq.user.email,
            }),
          });

          if (!subscribeResponse.ok) {
            await subscribeResponse.text();
            
          }
        } catch (subscribeError) {
          
        }
      }

      const response: TokenExchangeResponse = {
        success: true,
        message: "Successfully connected to sportsbook",
        sportsbook,
      };

      res.status(200).json(response);
    } catch (error: any) {
      res.status(500);
      throw new Error(error.message || "Failed to exchange authorization code");
    }
  }
);




const getTokenStatus = asyncHandler(
  async (req: Request, res: Response<OAuthTokenStatus>) => {
    const typedReq = req as AuthenticatedRequest;
    const { sportsbook } = req.params;

    if (!["betwiz", "winningedge"].includes(sportsbook)) {
      res.status(400);
      throw new Error("Invalid sportsbook");
    }

    const token = await OAuthToken.findOne({
      bet360Email: typedReq.user.email,
      sportsbook,
      isActive: true,
    });

    if (!token) {
      
      const response: OAuthTokenStatus = {
        bet360Email: typedReq.user.email,
        sportsbook: sportsbook as "betwiz" | "winningedge",
        isConnected: false,
        needsReconnection: false, 
      };
      res.status(200).json(response);
      return;
    }

    
    const needsReconnection = token.isRefreshTokenExpired();

    const response: OAuthTokenStatus = {
      bet360Email: token.bet360Email,
      sportsbook: token.sportsbook,
      isConnected: true,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      needsReconnection,
    };

    res.status(200).json(response);
  }
);




const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const typedReq = req as AuthenticatedRequest;
    const { sportsbook } = req.params;

    if (!["betwiz", "winningedge"].includes(sportsbook)) {
      res.status(400);
      throw new Error("Invalid sportsbook");
    }

    const token = await OAuthToken.findOne({
      bet360Email: typedReq.user.email,
      sportsbook,
      isActive: true,
    });

    if (!token) {
      res.status(404);
      throw new Error("No active token found");
    }

    if (token.isRefreshTokenExpired()) {
      res.status(401);
      throw new Error("Refresh token has expired. Please reconnect.");
    }

    
    const apiUrl = sportsbook === "betwiz" ? BETWIZ_API_URL : WINNINGEDGE_API_URL;
    const { refreshToken: decryptedRefreshToken } = token.getDecryptedTokens();

    try {
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
        const errorData = (await tokenResponse.json()) as { error?: string; error_description?: string };
        res.status(tokenResponse.status);
        throw new Error(errorData.error || "Failed to refresh token");
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

      res.status(200).json({
        message: "Token refreshed successfully",
        expiresAt: accessTokenExpiresAt,
      });
    } catch (error: any) {
      res.status(500);
      throw new Error(error.message || "Failed to refresh token");
    }
  }
);




const revokeToken = asyncHandler(
  async (req: Request, res: Response) => {
    const typedReq = req as AuthenticatedRequest;
    const { sportsbook } = req.params;

    if (!["betwiz", "winningedge"].includes(sportsbook)) {
      res.status(400);
      throw new Error("Invalid sportsbook");
    }

    const token = await OAuthToken.findOne({
      bet360Email: typedReq.user.email,
      sportsbook,
      isActive: true,
    });

    if (token) {
      token.isActive = false;
      await token.save();
    }

    res.status(200).json({ message: "Token revoked successfully" });
  }
);




const unsubscribe = asyncHandler(
  async (req: Request, res: Response) => {
    const typedReq = req as AuthenticatedRequest;
    const { sportsbook } = req.params;

    if (!["betwiz", "winningedge"].includes(sportsbook)) {
      res.status(400);
      const error = new Error("Invalid sportsbook") as any;
      error.status = 400;
      throw error;
    }

    
    const token = await OAuthToken.findOne({
      bet360Email: typedReq.user.email,
      sportsbook,
      isActive: true,
    });

    if (!token) {
      res.status(404);
      const error = new Error("No active connection found for this sportsbook") as any;
      error.status = 404;
      throw error;
    }

    
    const apiUrl = sportsbook === "betwiz" ? BETWIZ_API_URL : WINNINGEDGE_API_URL;

    try {
      
      let initialAccessToken: string;
      let decryptedRefreshToken: string;
      
      try {
        const decryptedTokens = token.getDecryptedTokens();
        initialAccessToken = decryptedTokens.accessToken;
        decryptedRefreshToken = decryptedTokens.refreshToken;
      } catch (decryptError: any) {
        
        
        token.isActive = false;
        await token.save();
        res.status(200).json({
          message: "Successfully unsubscribed from sportsbook (token was invalid)",
          sportsbook,
        });
        return;
      }

      const sportsbookUserId = token.sportsbookUserId;

      
      let accessToken = initialAccessToken;
      if (token.isAccessTokenExpired() || token.needsRefresh()) {
        if (!token.isRefreshTokenExpired()) {
          try {
            
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

            if (tokenResponse.ok) {
              interface TokenResponse {
                access_token: string;
                refresh_token: string;
                expires_in: number;
              }
              const tokenData = (await tokenResponse.json()) as TokenResponse;
              accessToken = tokenData.access_token;
            }
          } catch (refreshError) {
            
          }
        }
      }

      
      token.isActive = false;
      await token.save();

      
      if (sportsbookUserId) {
        try {
          const unsubscribeResponse = await fetch(`${apiUrl}/api/users/${sportsbookUserId}/unsubscribe`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              bet360Email: typedReq.user.email,
            }),
          });

          if (!unsubscribeResponse.ok) {
            await unsubscribeResponse.text();
            
          }
        } catch (unsubscribeError) {
          
        }
      }

      res.status(200).json({
        message: "Successfully unsubscribed from sportsbook",
        sportsbook,
      });
    } catch (error: any) {
      
      try {
        token.isActive = false;
        await token.save();
      } catch (saveError) {
        
      }
      
      const errorMessage = error.message || "Failed to unsubscribe from sportsbook";
      const unsubscribeError = new Error(errorMessage) as any;
      unsubscribeError.status = 500;
      throw unsubscribeError;
    }
  }
);

export { exchangeToken, getTokenStatus, refreshToken, revokeToken, unsubscribe };

