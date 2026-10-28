import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { signInBrowser } from "./live-session.mjs";

const settings = Object.fromEntries(
  (await readFile(resolve(".env.local"), "utf8"))
    .split(/\r?\n/)
    .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);
if (!settings.NEXT_PUBLIC_SUPABASE_URL || !settings.SUPABASE_SECRET_KEY)
  throw new Error("Test project credentials are unavailable");
if (
  new URL(settings.NEXT_PUBLIC_SUPABASE_URL).hostname !==
  "heyfvsldcxxhuxotfyjt.supabase.co"
)
  throw new Error("This smoke test is restricted to the linked test project");

process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(".playwright-browsers");
const { chromium } = await import("@playwright/test");
const admin = createClient(
  settings.NEXT_PUBLIC_SUPABASE_URL,
  settings.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const suffix = randomBytes(5).toString("hex");
const email = `codex-qa-${suffix}@iiti.ac.in`;
const password = `${randomBytes(20).toString("base64url")}Aa1!`;
const tripNote = `Fictional browser QA ${suffix}`;
const itemDescription = `Fictional browser QA item ${suffix}`;
let userId;
let travellerId;
let browser;

async function rows(table, column, value) {
  const result = await admin.from(table).select("id").eq(column, value);
  if (result.error) throw new Error(`${table} lookup: ${result.error.code}`);
  return result.data.map((row) => row.id);
}

async function remove(table, column, value) {
  const result = await admin.from(table).delete().eq(column, value);
  if (result.error) throw new Error(`${table} cleanup: ${result.error.code}`);
}

try {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user)
    throw new Error(`Test user creation: ${created.error?.code ?? "unknown"}`);
  userId = created.data.user.id;
  console.log("Created a temporary confirmed test identity");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await signInBrowser(context, settings, email, password);
  const page = await context.newPage();
  await page.goto("http://localhost:3000/community");
  await page.waitForURL("**/community/onboarding", { timeout: 20000 });
  console.log("Signed-in session reached onboarding");

  await page.getByLabel("Display name").fill(`QA member ${suffix}`);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/community", { timeout: 20000 });
  console.log("Onboarding reached the community feed");

  if (process.env.IITI_CONNECT_REGRESSION_TRIP_ID) {
    await page.goto(
      `http://localhost:3000/community/trips/${process.env.IITI_CONNECT_REGRESSION_TRIP_ID}`,
    );
    if (!(await page.getByRole("heading", { name: "Trip details" }).count()))
      throw new Error("Regression trip does not render");
    console.log("The supplied regression trip detail rendered");
  }

  await page.goto("http://localhost:3000/community/trips/new");
  const tripForm = page
    .locator("form")
    .filter({ has: page.locator('select[name="destination"]') });
  const zones = await tripForm
    .locator('select[name="destination"] option')
    .evaluateAll((options) =>
      options.map((option) => option.value).filter(Boolean),
    );
  if (!zones.length) throw new Error("A destination zone is required");
  await tripForm.locator('select[name="destination"]').selectOption(zones[0]);
  const departure = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const ist = new Date(departure.getTime() + 330 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
  await tripForm.locator('input[name="departure"]').fill(ist);
  await tripForm.locator('textarea[name="note"]').fill(tripNote);
  await page.getByRole("button", { name: "Publish trip" }).click();
  await page.waitForURL(/\/community\/trips\/[0-9a-f-]{36}$/, {
    timeout: 20000,
  });
  if (!(await page.getByText(tripNote).count()))
    throw new Error("Published trip detail did not show its note");
  console.log("Trip posted and its detail rendered");

  const travellerEmail = `codex-qa-traveller-${suffix}@iiti.ac.in`;
  const travellerPassword = `${randomBytes(20).toString("base64url")}Aa1!`;
  const traveller = await admin.auth.admin.createUser({
    email: travellerEmail,
    password: travellerPassword,
    email_confirm: true,
  });
  if (traveller.error || !traveller.data.user)
    throw new Error("Traveller creation failed");
  travellerId = traveller.data.user.id;
  const travellerClient = createClient(
    settings.NEXT_PUBLIC_SUPABASE_URL,
    settings.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await travellerClient.auth.signInWithPassword({
    email: travellerEmail,
    password: travellerPassword,
  });
  await travellerClient.rpc("create_own_profile", {
    p_display_name: `QA traveller ${suffix}`,
  });
  const campusZone = await travellerClient
    .from("location_zones")
    .select("id")
    .eq("label", "IIT Indore Campus")
    .single();
  const travellerTrip = await travellerClient.rpc("create_trip", {
    p_legs: [
      {
        direction: "outward",
        origin_zone_id: campusZone.data.id,
        destination_zone_id: zones[0],
        departure_at: new Date(Date.now() + 30 * 3600 * 1000).toISOString(),
        seats_available: 2,
      },
    ],
    p_accepts_items: true,
    p_note: `Fictional traveller trip ${suffix}`,
  });
  if (travellerTrip.error) throw new Error("Traveller trip failed");
  await page.goto(
    `http://localhost:3000/community/trips/${travellerTrip.data}`,
  );
  const askForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Ask traveller" }) });
  await askForm.locator('textarea[name="description"]').fill(itemDescription);
  await askForm.locator('input[name="budget"]').fill("100");
  await page.getByRole("button", { name: "Ask traveller" }).click();
  await page.waitForURL(/\/community\/items\/[0-9a-f-]{36}\?status=asked$/, {
    timeout: 20000,
  });
  // The route streams in after its loading state, so wait for the content.
  await page.getByText(itemDescription).waitFor({ timeout: 15000 });
  console.log("Asked a traveller to bring an item from their trip page");

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLxOQAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.locator('input[name="image"]').setInputFiles({
    name: "fictional-test.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByRole("button", { name: "Upload image" }).click();
  await page.waitForURL(/\/community\/items\/[0-9a-f-]{36}\?status=updated$/, {
    timeout: 20000,
  });
  if (
    !(await page
      .getByAltText("Product reference uploaded by the requester")
      .count())
  )
    throw new Error("Uploaded item image did not render");
  console.log("Private image uploaded and its signed image rendered");

  const itemId = page.url().split("/").at(-1).split("?")[0];
  await page.goto("http://localhost:3000/community/settings");
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.waitForURL(/\/auth\?status=account-deleted$/, { timeout: 20000 });
  const profile = await admin
    .from("profiles")
    .select("display_name,status")
    .eq("user_id", userId)
    .single();
  const item = await admin
    .from("item_requests")
    .select("status,image_path")
    .eq("id", itemId)
    .single();
  const images = await admin.storage
    .from("item-images")
    .list(`${userId}/${itemId}`);
  const identity = await admin.auth.admin.getUserById(userId);
  if (
    profile.data?.status !== "deleted" ||
    profile.data.display_name !== "Deleted member" ||
    item.data?.status !== "cancelled" ||
    item.data.image_path !== null ||
    images.error ||
    images.data.length !== 0 ||
    identity.data.user?.email === email
  )
    throw new Error("Account deletion left personal data behind");
  const retry = await createClient(
    settings.NEXT_PUBLIC_SUPABASE_URL,
    settings.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ).auth.signInWithPassword({ email, password });
  if (!retry.error) throw new Error("Deleted account could still sign in");
  console.log("Account deletion anonymized the profile and blocked sign-in");
} finally {
  await browser?.close();
  if (userId) {
    const items = await admin
      .from("item_requests")
      .select("id,image_path")
      .eq("requester_id", userId);
    if (items.error)
      throw new Error(`Item cleanup lookup: ${items.error.code}`);
    for (const item of items.data) {
      if (item.image_path) {
        const removed = await admin.storage
          .from("item-images")
          .remove([item.image_path]);
        if (removed.error)
          throw new Error(`Image cleanup: ${removed.error.name}`);
      }
      await remove("item_fulfilments", "request_id", item.id);
      await remove("item_requests", "id", item.id);
    }
    for (const owner of [userId, travellerId].filter(Boolean)) {
      for (const id of await rows("trips", "organizer_id", owner)) {
        await remove("journey_legs", "trip_id", id);
        await remove("trips", "id", id);
      }
    }
    if (travellerId) {
      await remove("notifications", "recipient_id", travellerId);
      await admin.auth.admin.deleteUser(travellerId);
    }
    await remove("notifications", "recipient_id", userId);
    // A soft-deleted identity may already be gone from the Admin API.
    await admin.auth.admin.deleteUser(userId);
    await remove("profiles", "user_id", userId);
    console.log("Temporary test data and identity removed");
  }
}
