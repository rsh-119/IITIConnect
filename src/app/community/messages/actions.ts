"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function openConversation(formData: FormData) {
  await requireActiveMember();
  const kind = z.enum(["join", "item"]).safeParse(formData.get("kind"));
  const contextId = z.uuid().safeParse(formData.get("contextId"));
  if (!kind.success || !contextId.success)
    redirect("/community/messages?status=invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_conversation", {
    p_context_kind: kind.data,
    p_context_id: contextId.data,
  });
  if (error || !data) redirect("/community/messages?status=unavailable");
  redirect(`/community/messages/${data}`);
}

export async function sendMessage(formData: FormData) {
  await requireActiveMember();
  const conversationId = z.uuid().safeParse(formData.get("conversationId"));
  const nonce = z.uuid().safeParse(formData.get("nonce"));
  const body = z
    .string()
    .trim()
    .min(1)
    .max(4000)
    .safeParse(formData.get("body"));
  if (!conversationId.success || !nonce.success || !body.success)
    redirect("/community/messages?status=invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_message", {
    p_conversation_id: conversationId.data,
    p_body: body.data,
    p_client_nonce: nonce.data,
  });
  redirect(
    `/community/messages/${conversationId.data}?status=${error ? "send-failed" : "sent"}`,
  );
}

export async function markRead(conversationId: string, messageId: number) {
  await requireActiveMember();
  if (
    !z.uuid().safeParse(conversationId).success ||
    !Number.isSafeInteger(messageId) ||
    messageId <= 0
  )
    return;
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
    p_message_id: messageId,
  });
}
