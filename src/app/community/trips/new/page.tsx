import { CommunityNav } from "@/components/community-nav";
import { TripSuggestions } from "@/components/trip-suggestions";
import { SubmitButton } from "@/components/submit-button";
import { requireActiveMember } from "@/lib/auth";
import { CAMPUS_ZONE_LABEL, type JourneyCandidate } from "@/lib/matching";
import { createClient } from "@/lib/supabase/server";
import { createTrip } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { profile } = await requireActiveMember();
  const { status } = await searchParams;
  const supabase = await createClient();
  const { data: zones, error } = await supabase
    .from("location_zones")
    .select("id,label")
    .order("label");
  const { data: upcoming } = await supabase
    .from("journey_legs")
    .select(
      "id,campus_id,origin_zone_id,destination_zone_id,departure_at,direction,status,seats_available,trips!journey_legs_trip_id_fkey!inner(id,status)",
    )
    .eq("status", "open")
    .eq("trips.status", "open")
    .gte("departure_at", new Date().toISOString())
    .order("departure_at")
    .limit(100);
  const legIds = (upcoming ?? []).map((leg) => leg.id);
  const { data: participants } = legIds.length
    ? await supabase
        .from("leg_participants")
        .select("leg_id")
        .in("leg_id", legIds)
    : { data: [] };
  const counts = new Map<string, number>();
  for (const participant of participants ?? [])
    counts.set(participant.leg_id, (counts.get(participant.leg_id) ?? 0) + 1);
  const journeys = (upcoming ?? []).map((leg) => {
    const trip = (Array.isArray(leg.trips) ? leg.trips[0] : leg.trips) as {
      id: string;
    };
    return {
      id: leg.id,
      campusId: leg.campus_id,
      originZoneId: leg.origin_zone_id,
      destinationZoneId: leg.destination_zone_id,
      departureAt: leg.departure_at,
      direction: leg.direction,
      status: leg.status,
      seatsAvailable: leg.seats_available,
      confirmedPassengers: counts.get(leg.id) ?? 0,
      acceptsItems: false,
      tripId: trip.id,
    };
  }) as (JourneyCandidate & { tripId: string })[];
  const campus = (zones ?? []).find((zone) => zone.label === CAMPUS_ZONE_LABEL);
  const destinations = (zones ?? []).filter((zone) => zone.id !== campus?.id);
  return (
    <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 sm:px-6 md:pb-12">
      <CommunityNav />
      <div className="mx-auto max-w-xl pt-10">
        <h1>
          <span className="serif">Heading</span> to the city?
        </h1>
        <p className="text-muted mt-3">
          Post your trip so other students can join you, or ask you to bring
          something back. Times are in India Standard Time.
        </p>
        {status && (
          <p role="alert" className="mt-5 rounded-2xl bg-[#fff4ec] p-4">
            {status === "time"
              ? "Choose a departure time in the future."
              : "Check your trip details and try again."}
          </p>
        )}
        {error || !campus || !destinations.length ? (
          <p className="mt-8 rounded-[24px] border bg-white p-5">
            Location zones are unavailable. Please try again later.
          </p>
        ) : (
          <form
            action={createTrip}
            className="rise mt-8 grid gap-4 rounded-[28px] border bg-white p-5 sm:grid-cols-2 sm:p-7"
          >
            <input type="hidden" name="origin" value={campus.id} />
            <label className="block text-sm font-bold sm:col-span-2">
              Where to?
              <select
                name="destination"
                required
                className="mt-2 min-h-12 w-full px-4 text-base font-medium"
              >
                <option value="">Choose a destination</option>
                {destinations.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.label}
                  </option>
                ))}
              </select>
              <span className="text-muted mt-1.5 block text-xs font-medium">
                Leaving from {campus.label}
              </span>
            </label>
            <label className="block text-sm font-bold">
              When?
              <input
                name="departure"
                type="datetime-local"
                required
                className="mt-2 min-h-12 w-full px-4 text-base font-medium"
              />
            </label>
            <label className="block text-sm font-bold">
              Seats free
              <input
                name="seats"
                type="number"
                min="1"
                max="8"
                defaultValue="2"
                required
                className="mt-2 min-h-12 w-full px-4 text-base font-medium"
              />
            </label>
            <label className="flex cursor-pointer items-start gap-3 border-y border-[#f1ebe6] py-4 sm:col-span-2">
              <input
                name="acceptsItems"
                type="checkbox"
                defaultChecked
                className="mt-0.5 size-5"
              />
              <span>
                <span className="block font-bold">Open to bring items</span>
                <span className="text-muted block text-sm">
                  Other students can ask you to pick something up in the city.
                  You choose whether to accept.
                </span>
              </span>
            </label>
            <label className="block text-sm font-bold sm:col-span-2">
              Note (optional)
              <textarea
                name="note"
                maxLength={500}
                rows={2}
                placeholder="Meeting point, luggage space, anything useful"
                className="mt-2 w-full px-4 py-3 text-base font-medium"
              />
            </label>
            <TripSuggestions campusId={profile.campus_id} journeys={journeys} />
            <SubmitButton
              pendingLabel="Publishing trip…"
              className="bg-accent min-h-13 px-6 text-base font-bold disabled:opacity-60 sm:col-span-2"
            >
              Publish trip
            </SubmitButton>
          </form>
        )}
      </div>
    </main>
  );
}
