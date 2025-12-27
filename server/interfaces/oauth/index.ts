export interface TokenExchangeRequest {
  code: string;
  codeVerifier: string;
  state: string;
  sportsbook: "betwiz" | "winningedge";
}

export interface TokenExchangeResponse {
  success: boolean;
  message: string;
  sportsbook?: "betwiz" | "winningedge";
}

export interface OAuthTokenStatus {
  bet360Email: string;
  sportsbook: "betwiz" | "winningedge";
  isConnected: boolean;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  needsReconnection: boolean;
}




