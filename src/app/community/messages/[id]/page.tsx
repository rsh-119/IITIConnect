import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { CommunityNav } from "@/components/community-nav";
import { ConversationUpdates } from "@/components/conversation-updates";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatIst } from "@/lib/time";
import { sendMessage } from "../actions";
import { blockMember } from "@/app/community/report/actions";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { profile } = await requireActiveMember();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { status } = await searchParams;
  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id,member_a,member_b")
    .eq("id", id)
    .maybeSingle();
  if (!conversation) notFound();
  const peerId =
    conversation.member_a === profile.user_id
      ? conversation.member_b
      : conversation.member_a;
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id,sender_id,body,created_at")
    .eq("conversation_id", id)
    .order("id", { ascending: false })
    .limit(50);
  const ordered = [...(messages ?? [])].reverse();
  return (
    <main className="mx-auto max-w-3xl px-4 pt-4 pb-28 sm:px-6 md:pb-12">
      <CommunityNav />
      <ConversationUpdates
        conversationId={id}
        latestMessageId={ordered.at(-1)?.id}
      />
      <h1 className="mt-10">Conversation</h1>
      <div className="mt-3 flex items-center gap-5 text-sm">
        <Link
          href={`/community/report?kind=profile&id=${peerId}`}
          className="text-slate-600 underline"
        >
          Report member
        </Link>
        <form action={blockMember}>
          <input type="hidden" name="memberId" value={peerId} />
          <button className="min-h-11 text-red-700 underline">
            Block member
          </button>
        </form>
      </div>
      {status === "send-failed" && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4">
          Message could not be sent. Try again.
        </p>
      )}
      {error ? (
        <p className="mt-8">Messages are unavailable.</p>
      ) : (
        <ol className="mt-8 space-y-3" aria-label="Messages">
          {ordered.map((message) => (
            <li
              key={message.id}
              className={`max-w-[85%] rounded-2xl p-4 ${message.sender_id === profile.user_id ? "ml-auto bg-[#fde9e1]" : "bg-white shadow-(--shadow-card)"}`}
            >
              <p className="whitespace-pre-wrap">{message.body}</p>
              <time className="mt-2 block text-xs text-slate-600">
                {formatIst(message.created_at)}
              </time>
              {message.sender_id !== profile.user_id && (
                <Link
                  href={`/community/report?kind=message&id=${message.id}`}
                  className="mt-2 inline-block text-xs text-slate-600 underline"
                >
                  Report message
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
      <form
        action={sendMessage}
        className="mt-8 rounded-2xl border border-slate-200 bg-white p-4"
      >
        <input type="hidden" name="conversationId" value={id} />
        <input type="hidden" name="nonce" value={crypto.randomUUID()} />
        <label htmlFor="message" className="block font-medium">
          Write a message
        </label>
        <textarea
          id="message"
          name="body"
          required
          maxLength={4000}
          rows={3}
          className="mt-2 w-full rounded-lg border border-slate-300 p-3"
        />
        <button className="bg-accent mt-3 min-h-11 rounded-lg px-5 font-semibold text-white">
          Send
        </button>
      </form>
    </main>
  );
}
