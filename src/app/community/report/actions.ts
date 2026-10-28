"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const reportSchema = z.object({
  kind: z.enum(["profile", "trip", "item", "message"]),
  id: z.string().min(1).max(40),
  reason: z.string().trim().min(10).max(1000),
});

export async function submitReport(formData: FormData) {
  await requireActiveMember();
  const parsed = reportSchema.safeParse({
    kind: formData.get("kind"),
    id: formData.get("id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect("/community/report?status=invalid");
  const { kind, id, reason } = parsed.data;
  if (kind === "message" ? !/^\d+$/.test(id) : !z.uuid().safeParse(id).success)
    redirect("/community/report?status=invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_content", {
    p_target_kind: kind,
    p_target_id: id,
    p_reason: reason,
  });
  redirect(`/community/report?status=${error ? "failed" : "sent"}`);
}

export async function blockMember(formData: FormData) {
  await requireActiveMember();
  const id = z.uuid().safeParse(formData.get("memberId"));
  if (!id.success) redirect("/community/messages?status=invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("block_member", {
    p_member_id: id.data,
  });
  redirect(`/community/messages?status=${error ? "block-failed" : "blocked"}`);
}
