import mongoose from "mongoose";
import colors from "./colors";

const connectToDatabase = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || "");

    console.log(
      ` MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold
    );
  } catch (error) {
    console.log(`Error: ${(error as Error).message}`.red.underline.bold);
    process.exit(1);
  }
};

export default connectToDatabase;

