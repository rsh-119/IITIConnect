"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveMember } from "@/lib/auth";
import { CAMPUS_ZONE_LABEL } from "@/lib/matching";
import { createClient } from "@/lib/supabase/server";
import { istLocalToUtc } from "@/lib/time";

const tripSchema = z.object({
  destination: z.uuid(),
  departure: z.string(),
  seats: z.coerce.number().int().min(1).max(8),
  acceptsItems: z.boolean(),
  note: z.string().trim().max(500),
});

// Every trip starts on campus; the member only picks where they are going.
export async function createTrip(formData: FormData) {
  await requireActiveMember();
  const parsed = tripSchema.safeParse({
    destination: formData.get("destination"),
    departure: formData.get("departure"),
    seats: formData.get("seats"),
    acceptsItems: formData.get("acceptsItems") === "on",
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) redirect("/community/trips/new?status=invalid");
  let departure: string;
  try {
    departure = istLocalToUtc(parsed.data.departure);
  } catch {
    redirect("/community/trips/new?status=invalid");
  }
  if (new Date(departure) <= new Date())
    redirect("/community/trips/new?status=time");
  const supabase = await createClient();
  const { data: campus } = await supabase
    .from("location_zones")
    .select("id")
    .eq("label", CAMPUS_ZONE_LABEL)
    .eq("active", true)
    .maybeSingle();
  if (!campus) redirect("/community/trips/new?status=unavailable");
  if (campus.id === parsed.data.destination)
    redirect("/community/trips/new?status=invalid");
  const { data, error } = await supabase.rpc("create_trip", {
    p_legs: [
      {
        direction: "outward",
        origin_zone_id: campus.id,
        destination_zone_id: parsed.data.destination,
        departure_at: departure,
        seats_available: parsed.data.seats,
      },
    ],
    p_accepts_items: parsed.data.acceptsItems,
    p_note: parsed.data.note,
  });
  if (error || !data) redirect("/community/trips/new?status=unavailable");
  redirect(`/community/trips/${data}`);
}

export async function openMatchedTrip(formData: FormData) {
  await requireActiveMember();
  const legId = z.uuid().safeParse(formData.get("legId"));
  if (!legId.success) redirect("/community?status=invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_match_open", {
    p_leg_id: legId.data,
  });
  if (!error && z.uuid().safeParse(data).success)
    redirect(`/community/trips/${data}`);
  if (error?.code !== "PGRST202") redirect("/community?status=invalid");

  // Older test databases may not yet have the aggregate metric RPC.
  const { data: leg, error: lookupError } = await supabase
    .from("journey_legs")
    .select("departure_at,trips!journey_legs_trip_id_fkey!inner(id,status)")
    .eq("id", legId.data)
    .eq("status", "open")
    .eq("trips.status", "open")
    .maybeSingle();
  const trip = leg && (Array.isArray(leg.trips) ? leg.trips[0] : leg.trips);
  if (
    lookupError ||
    !trip ||
    !z.uuid().safeParse(trip.id).success ||
    new Date(leg.departure_at) <= new Date()
  )
    redirect("/community?status=invalid");
  redirect(`/community/trips/${trip.id}`);
}

export async function requestJoin(formData: FormData) {
  await requireActiveMember();
  const legId = z.uuid().safeParse(formData.get("legId"));
  const tripId = z.uuid().safeParse(formData.get("tripId"));
  if (!legId.success || !tripId.success) redirect("/community?status=invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_join", {
    p_leg_id: legId.data,
  });
  redirect(
    `/community/trips/${tripId.data}?status=${error ? "join-failed" : "join-requested"}`,
  );
}

export async function decideJoin(formData: FormData) {
  await requireActiveMember();
  const requestId = z.uuid().safeParse(formData.get("requestId"));
  const tripId = z.uuid().safeParse(formData.get("tripId"));
  if (!requestId.success || !tripId.success) redirect("/community");
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_join", {
    p_request_id: requestId.data,
    p_accept: formData.get("decision") === "accept",
  });
  redirect(
    `/community/trips/${tripId.data}?status=${error ? "decision-failed" : "updated"}`,
  );
}

export async function withdrawJoin(formData: FormData) {
  await requireActiveMember();
  const requestId = z.uuid().safeParse(formData.get("requestId"));
  const tripId = z.uuid().safeParse(formData.get("tripId"));
  if (!requestId.success || !tripId.success) redirect("/community");
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_join", {
    p_request_id: requestId.data,
  });
  redirect(
    `/community/trips/${tripId.data}?status=${error ? "withdraw-failed" : "updated"}`,
  );
}

export async function setTripStatus(formData: FormData) {
  await requireActiveMember();
  const tripId = z.uuid().safeParse(formData.get("tripId"));
  const status = z
    .enum(["cancelled", "completed"])
    .safeParse(formData.get("status"));
  if (!tripId.success || !status.success) redirect("/community");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_trip_status", {
    p_trip_id: tripId.data,
    p_status: status.data,
  });
  redirect(
    `/community/trips/${tripId.data}?status=${error ? "update-failed" : "updated"}`,
  );
}

// One save for the organizer: time and seats (while nobody has joined), then
// the note and the bring-items toggle.
export async function editTrip(formData: FormData) {
  await requireActiveMember();
  const parsed = z
    .object({
      tripId: z.uuid(),
      version: z.coerce.number().int().positive(),
      note: z.string().trim().max(500),
      acceptsItems: z.boolean(),
      legId: z.uuid().optional(),
      departure: z.string().optional(),
      seats: z.coerce.number().int().min(1).max(8).optional(),
      fare: z.coerce.number().min(0).max(100000).optional(),
    })
    .safeParse({
      tripId: formData.get("tripId"),
      version: formData.get("version"),
      note: formData.get("note"),
      acceptsItems: formData.get("acceptsItems") === "on",
      legId: formData.get("legId") || undefined,
      departure: formData.get("departure") || undefined,
      seats: formData.get("seats") || undefined,
      fare: formData.get("fare") || undefined,
    });
  if (!parsed.success) redirect("/community?status=invalid");
  const failed = `/community/trips/${parsed.data.tripId}?status=update-failed`;
  const supabase = await createClient();
  if (parsed.data.legId && parsed.data.departure && parsed.data.seats) {
    let departure: string;
    try {
      departure = istLocalToUtc(parsed.data.departure);
    } catch {
      redirect(failed);
    }
    const { error } = await supabase.rpc("update_leg", {
      p_leg_id: parsed.data.legId,
      p_departure_at: departure,
      p_seats_available: parsed.data.seats,
      p_fare_estimate: parsed.data.fare ?? null,
    });
    if (error) redirect(failed);
  }
  const { error } = await supabase.rpc("update_trip", {
    p_trip_id: parsed.data.tripId,
    p_expected_version: parsed.data.version,
    p_note: parsed.data.note,
    p_accepts_items: parsed.data.acceptsItems,
  });
  redirect(
    error ? failed : `/community/trips/${parsed.data.tripId}?status=updated`,
  );
}
