import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/env";

export async function getCurrentMember() {
  if (!hasSupabaseConfig()) return null;
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claims?.claims?.sub) return null;
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user?.email_confirmed_at) return null;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "user_id,campus_id,display_name,status,role,notification_preferences",
    )
    .eq("user_id", userResult.user.id)
    .maybeSingle();
  if (profileError) throw new Error("Unable to load profile");
  return { user: userResult.user, profile };
}

export async function requireActiveMember() {
  const member = await getCurrentMember();
  if (!member) redirect("/auth");
  if (!member.profile || member.profile.status !== "active")
    redirect("/community/onboarding");
  return { ...member, profile: member.profile };
}
