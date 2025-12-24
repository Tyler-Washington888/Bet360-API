import mongoose from "mongoose";
import colors from "./colors";

const MAX_RETRIES = 10;
const RETRY_DELAY = 10000; 
let isConnecting = false;
let connectionAttempts = 0;

const connectToDatabase = async (retryCount = 0, silent = false): Promise<boolean> => {
  if (isConnecting) {
    return false; 
  }

  isConnecting = true;
  connectionAttempts++;

  try {
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      if (!silent) {
        console.log("⚠️  Warning: MONGO_URI is not defined in environment variables".yellow.bold);
        console.log("   Server will start but database operations will fail.\n".yellow);
      }
      isConnecting = false;
      return false;
    }

    
    const options: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 10000, 
      socketTimeoutMS: 45000, 
      maxPoolSize: 10,
      retryWrites: true,
    };

    const conn = await mongoose.connect(mongoUri, options);

    if (!silent) {
      console.log(
        `✅ MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold
      );
    }
    isConnecting = false;
    connectionAttempts = 0;
    return true;
  } catch (error: any) {
    isConnecting = false;
    const errorMessage = error?.message || "Unknown error";
    
    
    if (retryCount === 0 || retryCount % 5 === 0) {
      
      if (errorMessage.includes("whitelist") || errorMessage.includes("ENOTFOUND") || errorMessage.includes("ETIMEDOUT")) {
        console.log("\n⚠️  MongoDB Atlas Connection Error:".yellow.bold);
        console.log(`   ${errorMessage}`.red);
        console.log("\n💡 Possible solutions:".yellow);
        console.log("   1. Check if your IP address is whitelisted in MongoDB Atlas");
        console.log("   2. Go to: https://cloud.mongodb.com/security/network/whitelist");
        console.log("   3. Or use 0.0.0.0/0 to allow all IPs (less secure, for development only)");
        console.log("   4. Verify your MONGO_URI in .env file is correct");
        console.log("\n🔄 Server will continue retrying in the background...\n".yellow);
      } else {
        console.log(`\n❌ Database Connection Error: ${errorMessage}`.red);
        console.log("🔄 Retrying in background...\n".yellow);
      }
    }

    
    if (retryCount < MAX_RETRIES) {
      setTimeout(async () => {
        await connectToDatabase(retryCount + 1, true);
      }, RETRY_DELAY);
    } else {
      console.log("\n⚠️  Max retries reached. Database connection failed.".yellow.bold);
      console.log("   Server is running but database operations will fail.".yellow);
      console.log("   Fix the connection issue and restart the server.\n".yellow);
    }
    
    return false;
  }
};

export default connectToDatabase;


