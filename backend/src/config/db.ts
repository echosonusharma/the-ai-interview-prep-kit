import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import { env } from "./env.js";

let isConnected = false;

export async function connectDB(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Avoid buffering commands before connection in serverless/test scenarios
  mongoose.set("strictQuery", true);

  const conn = await mongoose.connect(uri, {
    autoIndex: false,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });

  isConnected = conn.connection.readyState === 1;

  if (isConnected) {
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  }

  // Log connection events (once)
  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
    isConnected = false;
  });

  return conn;
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info("MongoDB disconnected gracefully");
  }
}

export { mongoose };
