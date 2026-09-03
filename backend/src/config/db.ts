import mongoose from "mongoose";
import { env } from "./env.js";

let isConnected = false;

/**
 * Connect to MongoDB via Mongoose.
 * - No-op if already connected (handles HMR / tsx watch reloads).
 * - Throws on failure so caller can fail-fast.
 */
export async function connectDB(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Avoid buffering commands before connection in serverless/test scenarios
  mongoose.set("strictQuery", true);

  const conn = await mongoose.connect(uri, {
    autoIndex: true, // true in dev; set false in prod via env if needed
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });

  isConnected = conn.connection.readyState === 1;

  if (isConnected) {
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  }

  // Log connection events (once)
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
    isConnected = false;
  });

  return conn;
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log("MongoDB disconnected gracefully");
  }
}

export { mongoose };
