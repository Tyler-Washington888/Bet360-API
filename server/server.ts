import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";
import colors from "./config/colors";
import connectToDatabase from "./config/db";
import { errorHandler } from "./middleware/errorMiddleware";
import userRoutes from "./routes/userRoutes";

const PORT: number = parseInt(process.env.PORT || "5000", 10);

dotenv.config();

connectToDatabase();

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/users", userRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(colors.yellow.bold(`Server running on port:  ${PORT}`));
});

