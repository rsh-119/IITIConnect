"use server";

import { z } from "zod";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const endpointSchema = z
  .url()
  .max(2048)
  .refine((value) => value.startsWith("https://"));
const keySchema = z.string().regex(/^[A-Za-z0-9_-]+$/);
const subscriptionSchema = z.object({
  endpoint: endpointSchema,
  p256dh: keySchema.min(80).max(120),
  auth: keySchema.min(16).max(40),
});

export async function savePushSubscription(input: unknown) {
  await requireActiveMember();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.p256dh,
    p_auth_secret: parsed.data.auth,
  });
  return { ok: !error };
}

export async function removePushSubscription(endpoint: string) {
  await requireActiveMember();
  const parsed = endpointSchema.safeParse(endpoint);
  if (!parsed.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_push_subscription", {
    p_endpoint: parsed.data,
  });
  return { ok: !error };
}
