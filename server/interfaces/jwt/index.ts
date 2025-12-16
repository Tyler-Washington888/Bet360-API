// JWT payload interface
export interface JWTPayload {
  id: string;
  iat?: number;
  exp?: number;
}

