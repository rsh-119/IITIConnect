import Link from "next/link";
import { CommunityNav } from "@/components/community-nav";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatIst } from "@/lib/time";
import { markNotificationRead } from "./actions";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  join_request: "Someone requested to join your trip.",
  join_accepted: "Your trip request was accepted.",
  join_rejected: "Your trip request was declined.",
  item_offer: "A traveller offered to bring your item.",
  item_accepted: "Your item offer was accepted.",
  item_asked: "A student asked you to bring something on your trip.",
  item_ask_accepted: "Your ask was accepted. The traveller will bring it.",
  item_ask_declined: "Your ask was declined by the traveller.",
  message: "You have a new message.",
  trip_cancelled: "A trip you joined was cancelled.",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireActiveMember();
  const { status } = await searchParams;
  const supabase = await createClient();
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id,kind,entity_id,read_at,created_at")
    .order("id", { ascending: false })
    .limit(50);
  return (
    <main className="mx-auto max-w-3xl px-4 pt-4 pb-28 sm:px-6 md:pb-12">
      <CommunityNav />
      <h1 className="mt-10">
        <span className="serif">Your</span> notifications
      </h1>
      {status === "failed" && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4">
          Could not mark that notification as read.
        </p>
      )}
      {error ? (
        <p className="mt-8">Notifications are unavailable right now.</p>
      ) : !notifications?.length ? (
        <p className="mt-8 rounded-[20px] border bg-white p-6">
          Nothing new yet.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`rounded-[20px] border bg-white p-5 ${notification.read_at ? "opacity-75" : "ring-2 ring-[#f0643c]/30"}`}
            >
              <p className="font-medium">
                {labels[notification.kind] ?? "Your activity was updated."}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {formatIst(notification.created_at)}
              </p>
              <div className="mt-3 flex gap-4">
                {notification.kind === "message" && notification.entity_id && (
                  <Link
                    href={`/community/messages/${notification.entity_id}`}
                    className="text-accent font-semibold underline"
                  >
                    Open conversation
                  </Link>
                )}
                {notification.kind === "trip_cancelled" &&
                  notification.entity_id && (
                    <Link
                      href={`/community/trips/${notification.entity_id}`}
                      className="text-accent font-semibold underline"
                    >
                      Open trip
                    </Link>
                  )}
                {notification.kind.startsWith("item_") &&
                  notification.entity_id && (
                    <Link
                      href={`/community/items/${notification.entity_id}`}
                      className="text-accent font-semibold underline"
                    >
                      Open item
                    </Link>
                  )}
                {!notification.read_at && (
                  <form action={markNotificationRead}>
                    <input type="hidden" name="id" value={notification.id} />
                    <button className="min-h-11 rounded-lg border border-slate-300 bg-white px-3">
                      Mark read
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
