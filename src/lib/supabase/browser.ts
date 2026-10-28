import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/env";

export function createClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient(url, key);
}
