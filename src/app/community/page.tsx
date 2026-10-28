import Link from "next/link";
import { SeatDots } from "@/components/brand";
import { CommunityNav } from "@/components/community-nav";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatIstShort, istDayRange } from "@/lib/time";

export const dynamic = "force-dynamic";

type Filters = {
  zone?: string;
  date?: string;
  search?: string;
  page?: string;
  status?: string;
};

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const { profile } = await requireActiveMember();
  const filters = await searchParams;
  const supabase = await createClient();
  const page = Math.max(
    1,
    Math.min(100, Number.parseInt(filters.page ?? "1", 10) || 1),
  );
  const zoneId = /^[0-9a-f-]{36}$/i.test(filters.zone ?? "")
    ? filters.zone
    : undefined;
  const date = istDayRange(filters.date ?? "");
  const search = (filters.search ?? "")
    .trim()
    .slice(0, 50)
    .replaceAll(/[%,()]/g, "");
  const { data: zones } = await supabase
    .from("location_zones")
    .select("id,label")
    .order("label");
  const zoneNames = new Map((zones ?? []).map((zone) => [zone.id, zone.label]));
  const start = (page - 1) * 20;
  let query = supabase
    .from("journey_legs")
    .select(
      "id,direction,origin_zone_id,destination_zone_id,departure_at,seats_available,trips!journey_legs_trip_id_fkey!inner(id,status,note,accepts_items)",
    )
    .eq("status", "open")
    .eq("trips.status", "open")
    .gte("departure_at", new Date().toISOString())
    .order("departure_at")
    .range(start, start + 20);
  if (zoneId) query = query.eq("destination_zone_id", zoneId);
  if (date)
    query = query.gte("departure_at", date.start).lt("departure_at", date.end);
  if (search) query = query.ilike("trips.note", `%${search}%`);
  const { data, error } = await query;
  const hasMore = (data?.length ?? 0) > 20;
  const rows = (data ?? []).slice(0, 20).map((leg) => {
    const trip = (Array.isArray(leg.trips) ? leg.trips[0] : leg.trips) as {
      id: string;
      note: string | null;
      accepts_items: boolean;
    };
    return {
      id: leg.id,
      href: `/community/trips/${trip.id}`,
      to: zoneNames.get(leg.destination_zone_id) ?? "Zone",
      from: zoneNames.get(leg.origin_zone_id) ?? "Zone",
      when: formatIstShort(leg.departure_at),
      seats: leg.seats_available,
      returning: leg.direction === "return",
      items: trip.accepts_items,
      note: trip.note,
    };
  });
  const nextParams = new URLSearchParams({
    ...(zoneId ? { zone: zoneId } : {}),
    ...(date ? { date: filters.date ?? "" } : {}),
    ...(search ? { search } : {}),
    page: String(page + 1),
  });
  return (
    <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 sm:px-6 md:pb-12">
      <CommunityNav />
      <section className="flex flex-wrap items-end justify-between gap-6 px-1 pt-10 pb-8">
        <div>
          <h1>
            <span className="serif">Hello,</span> {profile.display_name}
          </h1>
          <p className="text-muted mt-3 max-w-md">
            Trips leaving campus soon. Join a ride, or ask a traveller to bring
            something back.
          </p>
        </div>
        <Link
          href="/community/trips/new"
          className="bg-accent inline-flex min-h-12 items-center px-6 font-bold no-underline"
        >
          Post a trip
        </Link>
      </section>
      <form
        method="get"
        className="grid gap-3 rounded-[24px] border bg-white p-4 sm:grid-cols-[repeat(3,1fr)_auto] sm:items-end"
      >
        <label className="text-muted text-sm font-semibold">
          Where to
          <select
            name="zone"
            defaultValue={zoneId ?? ""}
            className="mt-1.5 min-h-11 w-full px-3"
          >
            <option value="">Anywhere</option>
            {(zones ?? []).map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-muted text-sm font-semibold">
          Date
          <input
            name="date"
            type="date"
            defaultValue={date ? filters.date : ""}
            className="mt-1.5 min-h-11 w-full px-3"
          />
        </label>
        <label className="text-muted text-sm font-semibold">
          Search notes
          <input
            name="search"
            type="search"
            maxLength={50}
            defaultValue={search}
            className="mt-1.5 min-h-11 w-full px-3"
          />
        </label>
        <button className="bg-accent min-h-11 px-6 font-bold">Search</button>
      </form>
      {filters.status && (
        <p role="status" className="mt-5 rounded-2xl bg-[#fff4ec] p-4">
          The requested action could not be completed.
        </p>
      )}
      <div className="mt-8" aria-live="polite">
        {error ? (
          <p className="rounded-2xl bg-red-50 p-5">
            The trips could not load. Please try again.
          </p>
        ) : rows.length === 0 ? (
          <div className="rounded-[24px] border bg-white p-8 text-center">
            <p className="text-xl font-bold">No trips here yet</p>
            <p className="text-muted mt-2">
              Post one and it shows up for everyone on campus.
            </p>
          </div>
        ) : (
          <ol className="grid gap-3 sm:grid-cols-2">
            {rows.map((row, index) => (
              <li
                key={row.id}
                className="rise"
                style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
              >
                <Link
                  href={row.href}
                  className="group flex h-full flex-col gap-4 rounded-[24px] border bg-white p-5 no-underline transition-transform hover:-translate-y-0.5"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-xl font-extrabold tracking-tight">
                        {row.returning ? `Back from ${row.from}` : row.to}
                      </span>
                    </span>
                    <time className="chip shrink-0">{row.when}</time>
                  </span>
                  {row.note && (
                    <span className="text-muted line-clamp-2 text-sm">
                      {row.note}
                    </span>
                  )}
                  <span className="mt-auto flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <SeatDots seats={row.seats} />
                      {row.seats} seat{row.seats === 1 ? "" : "s"}
                    </span>
                    {row.items && (
                      <span className="chip chip-coral">Can bring items</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
      {hasMore && (
        <Link
          href={`/community?${nextParams.toString()}`}
          className="mt-6 inline-flex min-h-11 items-center border px-5 font-semibold no-underline"
        >
          More trips
        </Link>
      )}
    </main>
  );
}
