import { z } from "zod";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_JWT_SECRET: z.string().min(1).optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Shipyard Material Lifecycle System"),

  // AI
  GEMINI_API_KEY: z.string().optional(),
  GROK_API_KEY: z.string().optional(),
  AI_DEFAULT_PROVIDER: z.enum(["gemini", "grok"]).default("gemini"),

  // Webhook
  WEBHOOK_SECRET: z.string().optional(),

  // Feature flags
  NEXT_PUBLIC_ENABLE_CHATBOT: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  NEXT_PUBLIC_ENABLE_RECOVERY_MODULE: z
    .string()
    .transform((v) => v === "true")
    .default("true"),

  // Node env
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. Check .env.example.");
  }
  return parsed.data;
}

export const env = validateEnv();
