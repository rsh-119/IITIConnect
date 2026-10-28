"use server";

import { redirect } from "next/navigation";
import {
  getSupabaseConfig,
  hasSupabaseConfig,
  parseServerEnv,
} from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// IIT Indore Google Workspace is the only sign-in method.
export async function signInWithGoogle() {
  if (!hasSupabaseConfig()) redirect("/auth?status=unavailable");
  const env = parseServerEnv(process.env);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL("/auth/google/callback", env.APP_ORIGIN).toString(),
      // Show the Google accounts already on this device, limited to the campus.
      queryParams: { hd: "iiti.ac.in", prompt: "select_account" },
    },
  });
  if (error || !data.url) redirect("/auth?status=google-unavailable");
  const providerUrl = new URL(data.url);
  if (providerUrl.origin !== new URL(getSupabaseConfig().url).origin)
    redirect("/auth?status=google-unavailable");
  redirect(providerUrl.toString());
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
