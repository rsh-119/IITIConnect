"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { markRead } from "@/app/community/messages/actions";

export function ConversationUpdates({
  conversationId,
  latestMessageId,
}: {
  conversationId: string;
  latestMessageId?: number;
}) {
  const router = useRouter();
  const [connection, setConnection] = useState<
    "connecting" | "live" | "delayed"
  >("connecting");
  useEffect(() => {
    let active = true;
    if (latestMessageId) void markRead(conversationId, latestMessageId);
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          if (payload.new.conversation_id === conversationId) router.refresh();
        },
      )
      .on("system", "*", (payload) => {
        if (payload.extension === "postgres_changes" && payload.status === "ok")
          setConnection("live");
      });
    void supabase.realtime
      .setAuth()
      .then(() => {
        if (!active) return;
        channel.subscribe((status) => {
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          )
            setConnection("delayed");
        });
      })
      .catch(() => {
        if (active) setConnection("delayed");
      });
    const timer = window.setInterval(() => router.refresh(), 20_000);
    // The socket heartbeat can take a minute to notice a lost network; the
    // browser knows at once, so reflect it immediately and recheck on return.
    const offline = () => setConnection("delayed");
    const online = () => {
      router.refresh();
      setConnection(channel.state === "joined" ? "live" : "delayed");
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      active = false;
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, latestMessageId, router]);
  return (
    <p role="status" className="mt-3 text-xs text-slate-500">
      {connection === "live"
        ? "Live message updates connected."
        : connection === "delayed"
          ? "Live updates are delayed. Messages refresh automatically."
          : "Connecting to live updates…"}
    </p>
  );
}
