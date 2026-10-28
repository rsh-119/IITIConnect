import Link from "next/link";
import { CommunityNav } from "@/components/community-nav";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatIst } from "@/lib/time";

export const dynamic = "force-dynamic";

const itemStates: Record<string, string> = {
  asked: "Waiting for your answer",
  offered: "Offered",
  accepted: "To buy",
  purchased: "Bought",
  ready: "Ready for handover",
  completed: "Handed over",
  declined: "Declined",
  cancelled: "Cancelled",
  disputed: "Problem reported",
};

export default async function ActivityPage() {
  const { profile } = await requireActiveMember();
  const supabase = await createClient();
  const [
    { data: trips, error: tripError },
    { data: items, error: itemError },
    { data: joins },
    { data: carrying },
  ] = await Promise.all([
    supabase
      .from("trips")
      .select(
        "id,status,created_at,journey_legs!journey_legs_trip_id_fkey(direction,departure_at,location_zones!journey_legs_destination_zone_id_campus_id_fkey(label))",
      )
      .eq("organizer_id", profile.user_id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("item_requests")
      .select("id,description,status,created_at")
      .eq("requester_id", profile.user_id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("join_requests")
      .select("id,leg_id,status,created_at")
      .eq("requester_id", profile.user_id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("item_fulfilments")
      .select("id,status,request_id,item_requests!inner(description)")
      .eq("traveller_id", profile.user_id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const legIds = (joins ?? []).map((join) => join.leg_id);
  const { data: legs } = legIds.length
    ? await supabase.from("journey_legs").select("id,trip_id").in("id", legIds)
    : { data: [] };
  const tripByLeg = new Map((legs ?? []).map((leg) => [leg.id, leg.trip_id]));
  return (
    <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 sm:px-6 md:pb-12">
      <CommunityNav />
      <div className="mx-auto max-w-3xl">
        <h1 className="mt-10">
          <span className="serif">My</span> activity
        </h1>
        {(tripError || itemError) && (
          <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4">
            Some activity could not be loaded.
          </p>
        )}
        <ActivitySection
          title="Trips I posted"
          empty="You have not posted a trip yet."
          rows={(trips ?? []).map((trip) => {
            const leg = (trip.journey_legs ?? []).find(
              (entry) => entry.direction === "outward",
            );
            const zone = leg?.location_zones as
              { label: string } | { label: string }[] | null | undefined;
            const to = Array.isArray(zone) ? zone[0]?.label : zone?.label;
            return {
              id: trip.id,
              label: `To ${to ?? "the city"}`,
              detail: `${leg ? formatIst(leg.departure_at) : formatIst(trip.created_at)} · ${trip.status}`,
              href: `/community/trips/${trip.id}`,
            };
          })}
        />
        <ActivitySection
          title="Items I'm bringing"
          empty="Nobody has asked you to bring anything yet."
          rows={(carrying ?? []).map((offer) => {
            const request = (
              Array.isArray(offer.item_requests)
                ? offer.item_requests[0]
                : offer.item_requests
            ) as { description: string };
            return {
              id: offer.id,
              label: request.description,
              detail: itemStates[offer.status] ?? offer.status,
              href: `/community/items/${offer.request_id}`,
            };
          })}
        />
        <ActivitySection
          title="Items I asked for"
          empty="You have not asked anyone to bring an item yet."
          rows={(items ?? []).map((item) => ({
            id: item.id,
            label: item.description,
            detail: item.status,
            href: `/community/items/${item.id}`,
          }))}
        />
        <ActivitySection
          title="Trips I asked to join"
          empty="No join requests yet."
          rows={(joins ?? [])
            .filter((join) => tripByLeg.has(join.leg_id))
            .map((join) => ({
              id: join.id,
              label: `Join request · ${join.status}`,
              detail: formatIst(join.created_at),
              href: `/community/trips/${tripByLeg.get(join.leg_id)}`,
            }))}
        />
      </div>
    </main>
  );
}

function ActivitySection({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<{ id: string; label: string; detail: string; href: string }>;
}) {
  return (
    <section className="mt-10">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="text-muted mt-4 rounded-[20px] bg-white/60 p-5">
          {empty}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={row.href}
                className="block rounded-[20px] border bg-white p-4 no-underline transition-transform hover:-translate-y-0.5"
              >
                <span className="font-semibold">{row.label}</span>
                <span className="text-muted mt-1 block text-sm">
                  {row.detail}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
