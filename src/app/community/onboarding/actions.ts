"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const nameSchema = z.string().trim().min(2).max(80);

export async function completeProfile(formData: FormData) {
  const parsed = nameSchema.safeParse(formData.get("displayName"));
  if (!parsed.success) redirect("/community/onboarding?status=name");
  const member = await getCurrentMember();
  if (!member) redirect("/auth");
  if (member.profile?.status === "suspended")
    redirect("/community/onboarding?status=suspended");
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_own_profile", {
    p_display_name: parsed.data,
  });
  if (error) redirect("/community/onboarding?status=unavailable");
  redirect("/community");
}
