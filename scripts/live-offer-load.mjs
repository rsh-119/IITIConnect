// Fires many simultaneous item-offer acceptances at the linked test project
// and checks exactly one wins. Uses fictional accounts and removes them.
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const settings = Object.fromEntries(
  (await readFile(resolve(".env.local"), "utf8"))
    .split(/\r?\n/)
    .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);
if (
  !settings.NEXT_PUBLIC_SUPABASE_URL ||
  !settings.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  !settings.SUPABASE_SECRET_KEY
)
  throw new Error("Test project credentials are unavailable");
if (
  new URL(settings.NEXT_PUBLIC_SUPABASE_URL).hostname !==
  "heyfvsldcxxhuxotfyjt.supabase.co"
)
  throw new Error("This load check is restricted to the linked test project");

const TRAVELLERS = Number(process.env.IITI_CONNECT_OFFER_LOAD ?? 8);
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(
  settings.NEXT_PUBLIC_SUPABASE_URL,
  settings.SUPABASE_SECRET_KEY,
  noSession,
);
const suffix = randomBytes(5).toString("hex");
const users = [];

async function member(index) {
  const email = `codex-load-${index}-${suffix}@iiti.ac.in`;
  const password = `${randomBytes(20).toString("base64url")}Aa1!`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user)
    throw new Error(`Test user creation: ${created.error?.code ?? "unknown"}`);
  users.push(created.data.user.id);
  const client = createClient(
    settings.NEXT_PUBLIC_SUPABASE_URL,
    settings.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    noSession,
  );
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw new Error(`Sign-in: ${signedIn.error.code}`);
  const profile = await client.rpc("create_own_profile", {
    p_display_name: `QA load ${index}`,
  });
  if (profile.error) throw new Error(`Profile: ${profile.error.code}`);
  return client;
}

async function ids(table, column, value) {
  const result = await admin.from(table).select("id").eq(column, value);
  if (result.error) throw new Error(`${table} lookup: ${result.error.code}`);
  return result.data.map((row) => row.id);
}

async function remove(table, column, value) {
  const result = await admin.from(table).delete().eq(column, value);
  if (result.error) throw new Error(`${table} cleanup: ${result.error.code}`);
}

try {
  const requester = await member(0);
  const travellers = await Promise.all(
    Array.from({ length: TRAVELLERS }, (_, index) => member(index + 1)),
  );
  const zones = await requester
    .from("location_zones")
    .select("id")
    .eq("active", true)
    .limit(2);
  if (zones.error || zones.data.length < 2)
    throw new Error("Two active zones are required");
  const [origin, destination] = zones.data.map((zone) => zone.id);
  const departure = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const item = await requester.rpc("create_item_request", {
    p_zone_id: destination,
    p_description: `Fictional load QA item ${suffix}`,
    p_quantity: 1,
    p_budget: 100,
    p_deadline: deadline,
    p_product_url: null,
  });
  if (item.error) throw new Error(`Item: ${item.error.code}`);

  const offerIds = await Promise.all(
    travellers.map(async (traveller) => {
      const trip = await traveller.rpc("create_trip", {
        p_legs: [
          {
            direction: "outward",
            origin_zone_id: origin,
            destination_zone_id: destination,
            departure_at: departure,
            seats_available: 1,
            fare_estimate: 50,
          },
        ],
        p_accepts_items: true,
        p_note: `Fictional load QA ${suffix}`,
      });
      if (trip.error) throw new Error(`Trip: ${trip.error.code}`);
      const leg = await traveller
        .from("journey_legs")
        .select("id")
        .eq("trip_id", trip.data)
        .single();
      if (leg.error) throw new Error(`Leg: ${leg.error.code}`);
      const offer = await traveller.rpc("offer_item", {
        p_request_id: item.data,
        p_leg_id: leg.data.id,
      });
      if (offer.error) throw new Error(`Offer: ${offer.error.code}`);
      return offer.data;
    }),
  );
  console.log(`${TRAVELLERS} fictional travellers offered on one item`);

  const started = Date.now();
  const results = await Promise.all(
    offerIds.map((offerId) =>
      requester.rpc("accept_item_offer", {
        p_fulfilment_id: offerId,
        p_description: "Fictional agreed load QA item",
        p_price: 75,
      }),
    ),
  );
  const elapsed = Date.now() - started;
  const succeeded = results.filter((result) => !result.error).length;
  const settled = await admin
    .from("item_fulfilments")
    .select("status")
    .eq("request_id", item.data);
  if (settled.error) throw new Error(`Settled: ${settled.error.code}`);
  const accepted = settled.data.filter((row) => row.status === "accepted");
  const declined = settled.data.filter((row) => row.status === "declined");
  if (
    succeeded !== 1 ||
    accepted.length !== 1 ||
    declined.length !== TRAVELLERS - 1
  )
    throw new Error(
      `Expected one winner; got ${succeeded} successful calls, ${accepted.length} accepted, ${declined.length} declined`,
    );
  console.log(
    `${TRAVELLERS} simultaneous acceptances left one winner in ${elapsed} ms`,
  );
} finally {
  for (const id of users) {
    for (const itemId of await ids("item_requests", "requester_id", id)) {
      await remove("item_fulfilments", "request_id", itemId);
      await remove("item_requests", "id", itemId);
    }
  }
  for (const id of users) {
    for (const tripId of await ids("trips", "organizer_id", id)) {
      await remove("journey_legs", "trip_id", tripId);
      await remove("trips", "id", tripId);
    }
  }
  for (const id of users) {
    await remove("notifications", "recipient_id", id);
    const deleted = await admin.auth.admin.deleteUser(id);
    if (deleted.error)
      throw new Error(`Test identity cleanup: ${deleted.error.code}`);
  }
  if (users.length) console.log("Temporary load data and identities removed");
}
