"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(formData: FormData) {
  await requireActiveMember();
  const id = z.coerce.number().int().positive().safeParse(formData.get("id"));
  if (!id.success) redirect("/community/notifications?status=invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: id.data,
  });
  redirect(`/community/notifications?status=${error ? "failed" : "read"}`);
}
