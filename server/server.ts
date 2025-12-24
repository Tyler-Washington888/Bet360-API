import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import colors from "./config/colors";
import connectToDatabase from "./config/db";
import { errorHandler } from "./middleware/errorMiddleware";
import userRoutes from "./routes/userRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import oauthRoutes from "./routes/oauthRoutes";
import { tokenRefreshService } from "./services/tokenRefreshService";

const PORT: number = parseInt(process.env.PORT || "5000", 10);

dotenv.config();

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/users", userRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/oauth", oauthRoutes);

app.use(errorHandler);


app.listen(PORT, async () => {
  console.log(colors.yellow.bold(`\n🚀 Server running on port:  ${PORT}\n`));

  
  const connected = await connectToDatabase();

  if (connected) {
    
    tokenRefreshService.start();
  } else {
    console.log(
      "⚠️  Database not connected. Token refresh service will start when database is available.\n"
        .yellow
    );

    
    const checkInterval = setInterval(() => {
      if (mongoose.connection.readyState === 1) {
        clearInterval(checkInterval);
        tokenRefreshService.start();
        console.log(
          "✅ Database connected! Token refresh service started.\n".green
        );
      }
    }, 5000);
  }
});
