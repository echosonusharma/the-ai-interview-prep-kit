import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().url().optional(),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/preppilot"),
  SESSION_SECRET: z.string().min(16).default("dev-secret-change-in-production"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = {
  PORT: parsed.data.PORT,
  NODE_ENV: parsed.data.NODE_ENV,
  FRONTEND_URL: parsed.data.FRONTEND_URL,
  MONGODB_URI: parsed.data.MONGODB_URI,
  SESSION_SECRET: parsed.data.SESSION_SECRET,
  isProd: parsed.data.NODE_ENV === "production",
};
