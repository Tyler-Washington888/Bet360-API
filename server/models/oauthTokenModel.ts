import mongoose, { Schema, Model, Document } from "mongoose";
import crypto from "crypto";

export interface IOAuthTokenDocument extends Omit<Document, "_id"> {
  _id: string;
  bet360Email: string;
  sportsbook: "betwiz" | "winningedge";
  sportsbookUserId?: string; 
  accessToken: string; 
  refreshToken: string; 
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  scope: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  setTokens(accessToken: string, refreshToken: string): void;
  getDecryptedTokens(): { accessToken: string; refreshToken: string };
  isAccessTokenExpired(): boolean;
  isRefreshTokenExpired(): boolean;
  needsRefresh(): boolean;
}



const getEncryptionKey = (): Buffer => {
  const envKey = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  if (envKey) {
    
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      return Buffer.from(envKey, "hex");
    }
    console.warn("⚠️  OAUTH_TOKEN_ENCRYPTION_KEY must be 64 hex characters. Generating new key (existing tokens will be invalid).");
  }
  
  
  console.warn("⚠️  No OAUTH_TOKEN_ENCRYPTION_KEY set. Using generated key (not persistent across restarts).");
  return crypto.randomBytes(32);
};

const ENCRYPTION_KEY = getEncryptionKey();
const ALGORITHM = "aes-256-cbc";


function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted text format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const oauthTokenSchema = new Schema<IOAuthTokenDocument>(
  {
    bet360Email: {
      type: String,
      required: [true, "Bet360 email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    sportsbook: {
      type: String,
      enum: ["betwiz", "winningedge"],
      required: [true, "Sportsbook is required"],
      index: true,
    },
    sportsbookUserId: {
      type: String,
      required: false,
      index: true,
    },
    accessToken: {
      type: String,
      required: [true, "Access token is required"],
    },
    refreshToken: {
      type: String,
      required: [true, "Refresh token is required"],
    },
    accessTokenExpiresAt: {
      type: Date,
      required: [true, "Access token expiration is required"],
      index: true,
    },
    refreshTokenExpiresAt: {
      type: Date,
      required: [true, "Refresh token expiration is required"],
      index: true,
    },
    scope: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);


oauthTokenSchema.virtual("decryptedAccessToken").get(function () {
  return decrypt(this.accessToken);
});


oauthTokenSchema.virtual("decryptedRefreshToken").get(function () {
  return decrypt(this.refreshToken);
});


oauthTokenSchema.methods.setTokens = function (accessToken: string, refreshToken: string) {
  this.accessToken = encrypt(accessToken);
  this.refreshToken = encrypt(refreshToken);
};


oauthTokenSchema.methods.getDecryptedTokens = function () {
  return {
    accessToken: decrypt(this.accessToken),
    refreshToken: decrypt(this.refreshToken),
  };
};


oauthTokenSchema.methods.isAccessTokenExpired = function (): boolean {
  return new Date() >= this.accessTokenExpiresAt;
};


oauthTokenSchema.methods.isRefreshTokenExpired = function (): boolean {
  return new Date() >= this.refreshTokenExpiresAt;
};


oauthTokenSchema.methods.needsRefresh = function (): boolean {
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  return fiveMinutesFromNow >= this.accessTokenExpiresAt;
};

const OAuthToken: Model<IOAuthTokenDocument> = mongoose.model<IOAuthTokenDocument>(
  "OAuthToken",
  oauthTokenSchema
);

export default OAuthToken;
export { encrypt, decrypt };

