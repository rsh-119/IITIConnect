"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function reviewReport(formData: FormData) {
  const { profile } = await requireActiveMember();
  if (profile.role !== "moderator") redirect("/community");
  const id = z.uuid().safeParse(formData.get("reportId"));
  const decision = z
    .enum(["dismiss", "suspend", "remove"])
    .safeParse(formData.get("decision"));
  const reason = z
    .string()
    .trim()
    .min(10)
    .max(1000)
    .safeParse(formData.get("reason"));
  if (!id.success || !decision.success || !reason.success)
    redirect("/community/moderation?status=invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_report", {
    p_report_id: id.data,
    p_decision: decision.data,
    p_reason: reason.data,
  });
  redirect(`/community/moderation?status=${error ? "failed" : "reviewed"}`);
}

export async function setZoneStatus(formData: FormData) {
  const { profile } = await requireActiveMember();
  if (profile.role !== "moderator") redirect("/community");
  const id = z.uuid().safeParse(formData.get("zoneId"));
  const active = z.enum(["true", "false"]).safeParse(formData.get("active"));
  const reason = z
    .string()
    .trim()
    .min(10)
    .max(1000)
    .safeParse(formData.get("reason"));
  if (!id.success || !active.success || !reason.success)
    redirect("/community/moderation?status=invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_zone_active", {
    p_zone_id: id.data,
    p_active: active.data === "true",
    p_reason: reason.data,
  });
  redirect(
    `/community/moderation?status=${error ? "zone-failed" : "zone-updated"}`,
  );
}
