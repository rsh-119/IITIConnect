import Link from "next/link";
import { CommunityNav } from "@/components/community-nav";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { profile } = await requireActiveMember();
  const { status } = await searchParams;
  const supabase = await createClient();
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id,member_a,member_b,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const { data: unread } = await supabase.rpc("conversation_unread_counts");
  const unreadByConversation = new Map(
    ((unread ?? []) as { conversation_id: string; unread_count: number }[]).map(
      (row) => [row.conversation_id, Number(row.unread_count)] as const,
    ),
  );
  const peerIds = (conversations ?? []).map((conversation) =>
    conversation.member_a === profile.user_id
      ? conversation.member_b
      : conversation.member_a,
  );
  const { data: peers } = peerIds.length
    ? await supabase
        .from("profiles")
        .select("user_id,display_name")
        .in("user_id", peerIds)
    : { data: [] };
  const names = new Map(
    (peers ?? []).map((peer) => [peer.user_id, peer.display_name]),
  );
  return (
    <main className="mx-auto max-w-3xl px-4 pt-4 pb-28 sm:px-6 md:pb-12">
      <CommunityNav />
      <h1 className="mt-10">
        <span className="serif">Your</span> messages
      </h1>
      <p className="mt-3 text-slate-600">
        Conversations are available only for your trip or item workflows.
      </p>
      {status && (
        <p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4">
          Could not open that conversation.
        </p>
      )}
      {error ? (
        <p className="mt-8">Messages are unavailable right now.</p>
      ) : !conversations?.length ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-6">
          No conversations yet.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {conversations.map((conversation) => {
            const peer =
              conversation.member_a === profile.user_id
                ? conversation.member_b
                : conversation.member_a;
            return (
              <li key={conversation.id}>
                <Link
                  href={`/community/messages/${conversation.id}`}
                  className="hover:border-accent block min-h-14 rounded-xl border border-slate-200 bg-white p-4 font-medium"
                >
                  Conversation with {names.get(peer) ?? "member"}
                  {(unreadByConversation.get(conversation.id) ?? 0) > 0 && (
                    <span className="chip chip-coral ml-3">
                      {unreadByConversation.get(conversation.id)} unread
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
