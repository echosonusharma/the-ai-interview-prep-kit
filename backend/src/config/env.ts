import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().url().optional(),
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
  isProd: parsed.data.NODE_ENV === "production",
};
