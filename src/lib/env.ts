import { z } from "zod";

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/);

const envSchema = z
  .object({
    APP_ORIGIN: z.url().default("http://localhost:3000"),
    ALLOWED_EMAIL_DOMAINS: z
      .string()
      .default("iiti.ac.in")
      .transform((value, context) => {
        const domains = value
          .split(",")
          .map((domain) => domain.trim())
          .filter(Boolean);
        const parsed = z.array(domainSchema).min(1).safeParse(domains);
        if (!parsed.success) {
          context.addIssue({
            code: "custom",
            message:
              "ALLOWED_EMAIL_DOMAINS must contain valid comma-separated domains",
          });
          return z.NEVER;
        }
        return [...new Set(parsed.data)];
      }),
    NEXT_PUBLIC_SUPABASE_URL: z.union([z.url(), z.literal("")]).optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z
      .union([z.string().regex(/^[A-Za-z0-9_-]{80,120}$/), z.literal("")])
      .optional(),
  })
  .superRefine((value, context) => {
    const hasUrl = Boolean(value.NEXT_PUBLIC_SUPABASE_URL);
    const hasKey = Boolean(value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    if (hasUrl !== hasKey)
      context.addIssue({
        code: "custom",
        message: "Supabase URL and publishable key must be configured together",
      });
  });

export function parseServerEnv(input: Record<string, string | undefined>) {
  return envSchema.parse(input);
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return { url, key };
}

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
