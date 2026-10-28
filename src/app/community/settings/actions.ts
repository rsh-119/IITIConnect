"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateSettings(formData: FormData) {
  const { profile } = await requireActiveMember();
  const name = z
    .string()
    .trim()
    .min(2)
    .max(80)
    .safeParse(formData.get("displayName"));
  if (!name.success) redirect("/community/settings?status=invalid");
  const preferences = {
    inApp: formData.get("inApp") === "on",
    push:
      (profile.notification_preferences as { push?: boolean } | null)?.push ===
      true,
  };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_own_profile", {
    p_display_name: name.data,
    p_notification_preferences: preferences,
  });
  redirect(`/community/settings?status=${error ? "failed" : "saved"}`);
}

export async function deleteAccount(formData: FormData) {
  const { user } = await requireActiveMember();
  if (formData.get("confirm") !== "DELETE")
    redirect("/community/settings?status=confirm-delete");
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Without the server key the sign-in and email could not be removed.
  if (!serviceKey || !url)
    redirect("/community/settings?status=delete-unavailable");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_own_account");
  if (error) {
    console.error("Account deletion failed", { code: error.code });
    redirect("/community/settings?status=delete-failed");
  }
  const admin = createAdminClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const images = (data ?? []) as string[];
  if (images.length) {
    const { error: imageError } = await admin.storage
      .from("item-images")
      .remove(images);
    if (imageError)
      console.error("Account image removal failed", { name: imageError.name });
  }
  // Soft deletion keeps the row other tables reference but clears the email,
  // identities and password, so the profile stays anonymous.
  const { error: authError } = await admin.auth.admin.deleteUser(user.id, true);
  if (authError)
    console.error("Account sign-in removal failed", { code: authError.code });
  await supabase.auth.signOut();
  redirect("/auth?status=account-deleted");
}
