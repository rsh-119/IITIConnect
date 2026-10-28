import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { SeatDots } from "@/components/brand";
import { CommunityNav } from "@/components/community-nav";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatIst, istInputValue } from "@/lib/time";
import {
  decideJoin,
  editTrip,
  requestJoin,
  setTripStatus,
  withdrawJoin,
} from "../actions";
import { openConversation } from "@/app/community/messages/actions";
import { answerCarryRequest, askToCarry } from "@/app/community/items/actions";

export const dynamic = "force-dynamic";

export default async function TripPage({
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
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select(
      "id,organizer_id,status,note,accepts_items,version,journey_legs!journey_legs_trip_id_fkey(id,direction,origin_zone_id,destination_zone_id,departure_at,seats_available,fare_estimate,status)",
    )
    .eq("id", id)
    .maybeSingle();
  if (tripError) {
    console.error("Trip detail lookup failed", { code: tripError.code });
    throw new Error("Unable to load trip details");
  }
  if (!trip) notFound();
  const legs = trip.journey_legs ?? [];
  const legIds = legs.map((leg) => leg.id);
  const [
    { data: zones },
    { data: requests },
    { data: participants },
    { data: asks },
  ] = await Promise.all([
    supabase.from("location_zones").select("id,label"),
    supabase
      .from("join_requests")
      .select("id,leg_id,requester_id,status")
      .in("leg_id", legIds),
    supabase
      .from("leg_participants")
      .select("leg_id,user_id")
      .in("leg_id", legIds),
    // RLS returns only asks the viewer is part of.
    supabase
      .from("item_fulfilments")
      .select(
        "id,status,request_id,item_requests!inner(description,quantity,budget_limit,requester_id)",
      )
      .eq("status", "asked")
      .in("leg_id", legIds),
  ]);
  const zoneName = new Map((zones ?? []).map((zone) => [zone.id, zone.label]));
  const isOrganizer = trip.organizer_id === profile.user_id;
  const outward = legs.find((leg) => leg.direction === "outward") ?? legs[0];
  const headline = outward
    ? (zoneName.get(outward.destination_zone_id) ?? "Trip")
    : "Trip";
  const outwardCount = outward
    ? (participants ?? []).filter(
        (participant) => participant.leg_id === outward.id,
      ).length
    : 0;
  return (
    <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 sm:px-6 md:pb-12">
      <CommunityNav />
      <div className="mx-auto max-w-3xl">
        <section className="rise mt-8 rounded-[28px] border bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="min-w-0">
              <span className="sr-only">Trip details: </span>
              <span className="serif">To</span> {headline}
            </h1>
            <span className={`chip ${trip.status === "open" ? "chip-go" : ""}`}>
              {trip.status}
            </span>
          </div>
          {outward && (
            <p className="mt-4 flex flex-wrap items-center gap-2">
              <time className="chip text-sm">
                {formatIst(outward.departure_at)}
              </time>
              {trip.accepts_items && (
                <span className="chip chip-coral">Can bring items</span>
              )}
            </p>
          )}
          {trip.note && (
            <p className="text-muted mt-5 border-t border-[#f1ebe6] pt-5 leading-relaxed">
              {trip.note}
            </p>
          )}
          {status && (
            <p
              role="status"
              className={`mt-5 rounded-2xl p-4 ${status.includes("failed") || status.includes("invalid") ? "bg-red-50" : "bg-[#fff4ec]"}`}
            >
              {status === "ask-failed"
                ? "Your ask could not be sent. The trip may no longer take items."
                : status === "ask-invalid"
                  ? "Describe the item in at least 5 characters and set a budget."
                  : status.includes("failed")
                    ? "That action could not be completed. Check the current trip state."
                    : "Trip updated."}
            </p>
          )}
          {!isOrganizer && (
            <Link
              href={`/community/report?kind=trip&id=${id}`}
              className="text-muted mt-4 inline-block text-sm underline"
            >
              Report trip
            </Link>
          )}
        </section>

        {legs.map((leg) => {
          const count = (participants ?? []).filter(
            (participant) => participant.leg_id === leg.id,
          ).length;
          const myRequest = (requests ?? []).find(
            (request) =>
              request.leg_id === leg.id &&
              request.requester_id === profile.user_id,
          );
          const pending = (requests ?? []).filter(
            (request) =>
              request.leg_id === leg.id && request.status === "pending",
          );
          return (
            <section
              key={leg.id}
              className="mt-5 rounded-[24px] border bg-white p-6"
            >
              <h2>
                {legs.length > 1
                  ? `${leg.direction === "return" ? "Coming back" : "Going"} · ${formatIst(leg.departure_at)}`
                  : "Seats"}
              </h2>
              <p className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold">
                <SeatDots seats={leg.seats_available} taken={count} />
                <span className="tabular">
                  {count}/{leg.seats_available} co-passenger seats confirmed
                </span>
              </p>
              {leg.fare_estimate != null && (
                <p className="text-muted mt-2 text-sm">
                  Estimated fare share:{" "}
                  <span className="text-ink tabular font-bold">
                    ₹{(Number(leg.fare_estimate) / (count + 1)).toFixed(2)}
                  </span>{" "}
                  per confirmed traveller
                </p>
              )}
              {!isOrganizer &&
                trip.status === "open" &&
                leg.status === "open" &&
                !myRequest &&
                count < leg.seats_available && (
                  <form action={requestJoin} className="mt-5">
                    <input type="hidden" name="legId" value={leg.id} />
                    <input type="hidden" name="tripId" value={id} />
                    <button className="bg-accent min-h-12 px-6 font-bold">
                      Request to join
                    </button>
                  </form>
                )}
              {myRequest && (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="chip">My request: {myRequest.status}</span>
                  {["pending", "accepted"].includes(myRequest.status) && (
                    <>
                      <form action={openConversation}>
                        <input type="hidden" name="kind" value="join" />
                        <input
                          type="hidden"
                          name="contextId"
                          value={myRequest.id}
                        />
                        <button className="min-h-11 border px-5">
                          Message organizer
                        </button>
                      </form>
                      <form action={withdrawJoin}>
                        <input
                          type="hidden"
                          name="requestId"
                          value={myRequest.id}
                        />
                        <input type="hidden" name="tripId" value={id} />
                        <button className="text-muted min-h-11 px-3 underline">
                          Withdraw
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )}
              {isOrganizer && pending.length > 0 && (
                <ul className="mt-5 divide-y divide-[#f1ebe6] border-t border-[#f1ebe6]">
                  {pending.map((request) => (
                    <li
                      key={request.id}
                      className="flex flex-wrap items-center gap-3 pt-4"
                    >
                      <span className="font-semibold">Join request</span>
                      <form action={decideJoin}>
                        <input
                          type="hidden"
                          name="requestId"
                          value={request.id}
                        />
                        <input type="hidden" name="tripId" value={id} />
                        <input type="hidden" name="decision" value="accept" />
                        <button className="bg-accent min-h-10 px-5 text-sm">
                          Accept
                        </button>
                      </form>
                      <form action={decideJoin}>
                        <input
                          type="hidden"
                          name="requestId"
                          value={request.id}
                        />
                        <input type="hidden" name="tripId" value={id} />
                        <input type="hidden" name="decision" value="reject" />
                        <button className="min-h-10 border px-5 text-sm">
                          Reject
                        </button>
                      </form>
                      <form action={openConversation}>
                        <input type="hidden" name="kind" value="join" />
                        <input
                          type="hidden"
                          name="contextId"
                          value={request.id}
                        />
                        <button className="text-muted min-h-10 px-2 text-sm underline">
                          Message
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        {isOrganizer && (asks ?? []).length > 0 && (
          <section className="mt-5 rounded-[24px] border bg-white p-6">
            <h2>Item asks</h2>
            <ul className="mt-2 divide-y divide-[#f1ebe6]">
              {(asks ?? []).map((ask) => {
                const request = (
                  Array.isArray(ask.item_requests)
                    ? ask.item_requests[0]
                    : ask.item_requests
                ) as {
                  description: string;
                  quantity: number;
                  budget_limit: number;
                };
                return (
                  <li key={ask.id} className="py-4">
                    <p className="font-semibold">{request.description}</p>
                    <p className="text-muted mt-1 text-sm">
                      Qty {request.quantity} · up to ₹{request.budget_limit}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <form action={answerCarryRequest}>
                        <input
                          type="hidden"
                          name="itemId"
                          value={ask.request_id}
                        />
                        <input type="hidden" name="offerId" value={ask.id} />
                        <input type="hidden" name="decision" value="accept" />
                        <button className="bg-accent min-h-10 px-5 text-sm">
                          Accept ask
                        </button>
                      </form>
                      <form action={answerCarryRequest}>
                        <input
                          type="hidden"
                          name="itemId"
                          value={ask.request_id}
                        />
                        <input type="hidden" name="offerId" value={ask.id} />
                        <input type="hidden" name="decision" value="decline" />
                        <button className="min-h-10 border px-5 text-sm">
                          Decline
                        </button>
                      </form>
                      <Link
                        href={`/community/items/${ask.request_id}`}
                        className="text-muted px-2 text-sm underline"
                      >
                        Details
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!isOrganizer && (asks ?? []).length > 0 && (
          <p className="mt-5 rounded-2xl bg-[#fff4ec] p-4 text-sm">
            You have {(asks ?? []).length} pending ask
            {(asks ?? []).length === 1 ? "" : "s"} on this trip.{" "}
            <Link href="/community/activity" className="text-accent underline">
              See them in My activity
            </Link>
            .
          </p>
        )}

        {!isOrganizer &&
          trip.status === "open" &&
          trip.accepts_items &&
          outward &&
          outward.status === "open" && (
            <form
              action={askToCarry}
              className="mt-5 grid gap-4 rounded-[24px] border bg-white p-6 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <h2>
                  <span className="serif">Ask to bring</span> something
                </h2>
                <p className="text-muted mt-2 text-sm">
                  The traveller can accept or decline. If they accept, your
                  budget is the agreed price. You can add a photo on the next
                  page, once the ask exists.
                </p>
              </div>
              <input type="hidden" name="tripId" value={id} />
              <input type="hidden" name="legId" value={outward.id} />
              <label className="block text-sm font-bold sm:col-span-2">
                What do you need?
                <textarea
                  name="description"
                  required
                  minLength={5}
                  maxLength={1000}
                  rows={2}
                  placeholder="e.g. A4 notebook and two blue gel pens"
                  className="mt-2 w-full px-4 py-3 text-base font-medium"
                />
              </label>
              <label className="block text-sm font-bold">
                Max budget (₹)
                <input
                  name="budget"
                  type="number"
                  min="0"
                  max="100000"
                  step="1"
                  required
                  placeholder="150"
                  className="mt-2 min-h-12 w-full px-4 text-base font-medium"
                />
              </label>
              <label className="block text-sm font-bold">
                Quantity
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue="1"
                  required
                  className="mt-2 min-h-12 w-full px-4 text-base font-medium"
                />
              </label>
              <button className="bg-accent min-h-12 px-6 font-bold sm:col-span-2">
                Ask traveller
              </button>
            </form>
          )}

        {isOrganizer && trip.status === "open" && (
          <section className="mt-5 rounded-[24px] border bg-white p-6">
            <h2>Edit trip</h2>
            <form action={editTrip} className="mt-4 grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="tripId" value={id} />
              <input type="hidden" name="version" value={trip.version} />
              {outward && outward.status === "open" && outwardCount === 0 && (
                <>
                  <input type="hidden" name="legId" value={outward.id} />
                  <input
                    type="hidden"
                    name="fare"
                    value={outward.fare_estimate ?? ""}
                  />
                  <label className="block text-sm font-bold">
                    When?
                    <input
                      name="departure"
                      type="datetime-local"
                      required
                      defaultValue={istInputValue(outward.departure_at)}
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
                      required
                      defaultValue={outward.seats_available}
                      className="mt-2 min-h-12 w-full px-4 text-base font-medium"
                    />
                  </label>
                </>
              )}
              <label className="block text-sm font-bold sm:col-span-2">
                Note
                <textarea
                  name="note"
                  maxLength={500}
                  defaultValue={trip.note ?? ""}
                  rows={2}
                  className="mt-2 w-full px-4 py-3 text-base font-medium"
                />
              </label>
              <label className="flex items-center gap-3 font-semibold sm:col-span-2">
                <input
                  type="checkbox"
                  name="acceptsItems"
                  defaultChecked={trip.accepts_items}
                  className="size-5"
                />
                Open to bring items
              </label>
              <button className="bg-accent min-h-12 px-6 font-bold sm:col-span-2">
                Save trip
              </button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[#f1ebe6] pt-5">
              <form action={setTripStatus}>
                <input type="hidden" name="tripId" value={id} />
                <input type="hidden" name="status" value="completed" />
                <button className="min-h-11 border px-5">Mark completed</button>
              </form>
              <form action={setTripStatus}>
                <input type="hidden" name="tripId" value={id} />
                <input type="hidden" name="status" value="cancelled" />
                <button className="min-h-11 border px-5 text-red-700">
                  Cancel trip
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
