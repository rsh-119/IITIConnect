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
if (
  !settings.NEXT_PUBLIC_SUPABASE_URL ||
  !settings.SUPABASE_SECRET_KEY ||
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
const users = [];
let browser;
let testZoneId;

async function ids(table, column, value) {
  const result = await admin.from(table).select("id").eq(column, value);
  if (result.error) throw new Error(`${table} lookup: ${result.error.code}`);
  return result.data.map((row) => row.id);
}

async function matchOpens() {
  const result = await admin
    .from("daily_product_metrics")
    .select("count")
    .eq("event", "match_opened")
    .eq("day", new Date().toISOString().slice(0, 10));
  if (result.error) throw new Error(`metric lookup: ${result.error.code}`);
  return result.data.reduce((sum, row) => sum + row.count, 0);
}

async function remove(table, column, value) {
  const result = await admin.from(table).delete().eq(column, value);
  if (result.error) throw new Error(`${table} cleanup: ${result.error.code}`);
}

async function member(index) {
  const email = `codex-interaction-${index}-${suffix}@iiti.ac.in`;
  const password = `${randomBytes(20).toString("base64url")}Aa1!`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user)
    throw new Error(`Test user creation: ${created.error?.code ?? "unknown"}`);
  users.push(created.data.user.id);
  const context = await browser.newContext();
  await signInBrowser(context, settings, email, password);
  const page = await context.newPage();
  await page.goto("http://localhost:3000/community");
  await page.waitForURL("**/community/onboarding", { timeout: 20000 });
  await page.getByLabel("Display name").fill(`QA interaction ${index}`);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/community", { timeout: 20000 });
  return page;
}

try {
  browser = await chromium.launch({ headless: true });
  const organizer = await member(1);
  const participant = await member(2);
  console.log("Two temporary members signed in and onboarded");

  await organizer.goto("http://localhost:3000/community/trips/new");
  const form = organizer.locator("form").filter({
    has: organizer.locator('select[name="destination"]'),
  });
  const zones = await form
    .locator('select[name="destination"] option')
    .evaluateAll((options) =>
      options.map((option) => option.value).filter(Boolean),
    );
  await form.locator('select[name="destination"]').selectOption(zones[0]);
  await form.locator('input[name="acceptsItems"]').check();
  const departure = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const departureIst = new Date(departure.getTime() + 330 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
  await form.locator('input[name="departure"]').fill(departureIst);
  await form.locator('textarea[name="note"]').fill(`Interaction QA ${suffix}`);
  await organizer.getByRole("button", { name: "Publish trip" }).click();
  await organizer.waitForURL(/\/community\/trips\/[0-9a-f-]{36}$/, {
    timeout: 20000,
  });
  const tripUrl = organizer.url();

  await participant.goto(tripUrl);
  await participant.getByRole("button", { name: "Request to join" }).click();
  await participant.waitForURL(/status=join-requested/, { timeout: 20000 });
  if (!(await participant.getByText("My request: pending").count()))
    throw new Error("Join request was not shown as pending");
  console.log("Second member requested a seat");

  await organizer.goto("http://localhost:3000/community/notifications");
  if (
    !(await organizer.getByText("Someone requested to join your trip.").count())
  )
    throw new Error("Organizer did not receive the join notification");
  await organizer.getByRole("button", { name: "Mark read" }).first().click();
  console.log("Join notification rendered and was marked read");

  await organizer.goto(tripUrl);
  await organizer.getByRole("button", { name: "Accept" }).click();
  await organizer.waitForURL(/status=updated/, { timeout: 20000 });
  await participant.reload();
  if (!(await participant.getByText("My request: accepted").count()))
    throw new Error("Accepted join did not appear for participant");
  await participant.goto("http://localhost:3000/community/notifications");
  if (!(await participant.getByText("Your trip request was accepted.").count()))
    throw new Error("Participant did not receive the acceptance notification");
  await participant.goto(tripUrl);
  console.log("Organizer accepted the seat request");

  await participant.getByRole("button", { name: "Message organizer" }).click();
  await participant.waitForURL(/\/community\/messages\/[0-9a-f-]{36}$/, {
    timeout: 20000,
  });
  const conversationUrl = participant.url();
  const message = `Fictional QA message ${suffix}`;
  await organizer.goto(conversationUrl);
  await organizer
    .getByText("Live message updates connected.")
    .waitFor({ timeout: 10000 });
  await participant.getByLabel("Write a message").fill(message);
  await participant.getByRole("button", { name: "Send" }).click();
  await participant.waitForURL(/status=sent/, { timeout: 20000 });
  await organizer.getByText(message).waitFor({ timeout: 12000 });
  console.log("Realtime conversation delivered the test message");
  await organizer.context().setOffline(true);
  await organizer
    .getByText("Live updates are delayed. Messages refresh automatically.")
    .waitFor({ timeout: 45000 });
  await organizer.context().setOffline(false);
  await organizer
    .getByText("Live message updates connected.")
    .waitFor({ timeout: 45000 });
  const reconnectedMessage = `Fictional QA reconnect ${suffix}`;
  await participant.getByLabel("Write a message").fill(reconnectedMessage);
  await participant.getByRole("button", { name: "Send" }).click();
  await organizer.getByText(reconnectedMessage).waitFor({ timeout: 12000 });
  console.log("Realtime conversation reconnected after going offline");

  await participant.goto("http://localhost:3000/community/trips/new");
  const suggestForm = participant.locator("form").filter({
    has: participant.locator('select[name="destination"]'),
  });
  await suggestForm
    .locator('select[name="destination"]')
    .selectOption(zones[0]);
  await suggestForm.locator('input[name="departure"]').fill(departureIst);
  const suggestion = participant
    .getByRole("button", { name: /View trip at/ })
    .first();
  await suggestion.waitFor({ timeout: 10000 });
  const opensBefore = await matchOpens();
  await suggestion.click();
  await participant.waitForURL(/\/community\/trips\/[0-9a-f-]{36}$/, {
    timeout: 20000,
  });
  if ((await matchOpens()) !== opensBefore + 1)
    throw new Error("Opening a compatible trip was not counted once");
  console.log("Compatible-trip open was counted once");

  async function askOn(url, description) {
    await participant.goto(url);
    const askForm = participant.locator("form").filter({
      has: participant.getByRole("button", { name: "Ask traveller" }),
    });
    await askForm.locator('textarea[name="description"]').fill(description);
    await askForm.locator('input[name="budget"]').fill("120");
    await participant.getByRole("button", { name: "Ask traveller" }).click();
    await participant.waitForURL(
      /\/community\/items\/[0-9a-f-]{36}\?status=asked$/,
      {
        timeout: 20000,
      },
    );
    return participant.url().split("?")[0];
  }
  const itemUrl = await askOn(tripUrl, `Fictional ask QA item ${suffix}`);
  await organizer.goto("http://localhost:3000/community/notifications");
  if (
    !(await organizer
      .getByText("A student asked you to bring something on your trip.")
      .count())
  )
    throw new Error("Traveller did not receive the ask notification");
  await organizer.goto(itemUrl);
  await organizer.getByRole("button", { name: "Accept ask" }).click();
  await organizer.waitForURL(/status=updated/, { timeout: 20000 });
  await participant.goto(itemUrl);
  if (!(await participant.getByText(/Agreed:.*accepted/).count()))
    throw new Error("Accepted ask was not displayed");
  console.log("Ask sent, notified and accepted by the traveller");

  const moderator = await member(3);
  const competitor = await member(4);
  await organizer.goto("http://localhost:3000/community/trips/new");
  const raceForm = organizer.locator("form").filter({
    has: organizer.locator('select[name="destination"]'),
  });
  await raceForm.locator('select[name="destination"]').selectOption(zones[0]);
  await raceForm.locator('input[name="seats"]').fill("1");
  await raceForm
    .locator('input[name="departure"]')
    .fill(
      new Date(Date.now() + 48 * 60 * 60 * 1000 + 330 * 60 * 1000)
        .toISOString()
        .slice(0, 16),
    );
  await raceForm
    .locator('textarea[name="note"]')
    .fill(`Seat race QA ${suffix}`);
  await organizer.getByRole("button", { name: "Publish trip" }).click();
  await organizer.waitForURL(/\/community\/trips\/[0-9a-f-]{36}$/, {
    timeout: 20000,
  });
  const raceTripUrl = organizer.url();
  for (const requester of [moderator, competitor]) {
    await requester.goto(raceTripUrl);
    await requester.getByRole("button", { name: "Request to join" }).click();
    await requester.waitForURL(/status=join-requested/, { timeout: 20000 });
  }
  const raceLegs = await admin
    .from("journey_legs")
    .select("id")
    .eq("trip_id", raceTripUrl.split("/").at(-1));
  if (raceLegs.error || raceLegs.data.length !== 1)
    throw new Error("Final-seat leg lookup failed");
  const raceRequests = await admin
    .from("join_requests")
    .select("id")
    .eq("leg_id", raceLegs.data[0].id);
  if (raceRequests.error || raceRequests.data.length !== 2)
    throw new Error("Final-seat request setup failed");
  const raceTab = await organizer.context().newPage();
  await Promise.all([organizer.goto(raceTripUrl), raceTab.goto(raceTripUrl)]);
  await Promise.all(
    [organizer, raceTab].map((page, index) =>
      page
        .locator("form")
        .filter({
          has: page.locator(
            `input[name="requestId"][value="${raceRequests.data[index].id}"]`,
          ),
        })
        .filter({ has: page.locator('input[name="decision"][value="accept"]') })
        .getByRole("button", { name: "Accept" })
        .click(),
    ),
  );
  await Promise.all(
    [organizer, raceTab].map((page) =>
      page.waitForURL(/status=(updated|decision-failed)/, { timeout: 20000 }),
    ),
  );
  const participants = await admin
    .from("leg_participants")
    .select("user_id")
    .eq("leg_id", raceLegs.data[0].id);
  if (participants.error || participants.data.length !== 1)
    throw new Error(
      `Final-seat acceptance did not preserve capacity: ${participants.error?.code ?? participants.data.length}`,
    );
  console.log("Concurrent final-seat acceptance preserved one seat");

  const raceItemUrl = await askOn(
    tripUrl,
    `Fictional answer race QA item ${suffix}`,
  );
  const answerTab = await organizer.context().newPage();
  await Promise.all([organizer.goto(raceItemUrl), answerTab.goto(raceItemUrl)]);
  await Promise.all([
    organizer.getByRole("button", { name: "Accept ask" }).click(),
    answerTab.getByRole("button", { name: "Decline" }).click(),
  ]);
  await Promise.all(
    [organizer, answerTab].map((page) =>
      page.waitForURL(/status=(updated|answer-failed)/, { timeout: 20000 }),
    ),
  );
  const raceRequest = await admin
    .from("item_requests")
    .select("status,item_fulfilments(status)")
    .eq("id", raceItemUrl.split("/").at(-1))
    .single();
  const raceOutcome = `${raceRequest.data?.status}/${raceRequest.data?.item_fulfilments?.[0]?.status}`;
  if (!["agreed/accepted", "cancelled/declined"].includes(raceOutcome))
    throw new Error(`Concurrent answers left a mixed state: ${raceOutcome}`);
  console.log("Concurrent accept and decline left one consistent outcome");

  await moderator.goto("http://localhost:3000/community/moderation");
  await moderator.waitForURL("**/community", { timeout: 20000 });
  const promoted = await admin
    .from("profiles")
    .update({ role: "moderator" })
    .eq("user_id", users[2]);
  if (promoted.error)
    throw new Error(`Moderator setup: ${promoted.error.code}`);
  const moderatorProfile = await admin
    .from("profiles")
    .select("campus_id")
    .eq("user_id", users[2])
    .single();
  if (moderatorProfile.error)
    throw new Error(`Moderator campus lookup: ${moderatorProfile.error.code}`);
  const zoneLabel = `QA zone ${suffix}`;
  const createdZone = await admin
    .from("location_zones")
    .insert({ campus_id: moderatorProfile.data.campus_id, label: zoneLabel })
    .select("id")
    .single();
  if (createdZone.error)
    throw new Error(`QA zone setup: ${createdZone.error.code}`);
  testZoneId = createdZone.data.id;
  await moderator.goto("http://localhost:3000/community/moderation");
  let zoneCard = moderator.locator("li").filter({ hasText: zoneLabel });
  await zoneCard
    .getByLabel("Reason for zone change")
    .fill("Disabling fictional QA zone");
  await zoneCard.getByRole("button", { name: "Disable zone" }).click();
  await moderator.waitForURL(/status=zone-updated/, { timeout: 20000 });
  zoneCard = moderator.locator("li").filter({ hasText: zoneLabel });
  await zoneCard.getByRole("button", { name: "Enable zone" }).waitFor();
  await zoneCard
    .getByLabel("Reason for zone change")
    .fill("Restoring fictional QA zone");
  await zoneCard.getByRole("button", { name: "Enable zone" }).click();
  await moderator.waitForURL(/status=zone-updated/, { timeout: 20000 });
  await moderator
    .locator("li")
    .filter({ hasText: zoneLabel })
    .getByRole("button", { name: "Disable zone" })
    .waitFor();
  const zoneActions = await admin
    .from("campus_management_actions")
    .select("id")
    .eq("zone_id", testZoneId);
  if (zoneActions.error || zoneActions.data.length !== 2)
    throw new Error(
      `Campus zone audit was not recorded: ${zoneActions.error?.code ?? zoneActions.data.length}`,
    );
  console.log("Moderator zone changes and audit passed");
  await participant.goto(
    `http://localhost:3000/community/report?kind=trip&id=${tripUrl.split("/").at(-1)}`,
  );
  await participant
    .getByLabel("What happened?")
    .fill("Fictional moderator workflow QA report");
  await participant.getByRole("button", { name: "Submit report" }).click();
  await participant.waitForURL(/status=sent/, { timeout: 20000 });
  await moderator.goto("http://localhost:3000/community/moderation");
  await moderator
    .getByRole("heading", { name: "Campus activity, last seven days" })
    .waitFor();
  if (!(await moderator.getByText(/trip created/).count()))
    throw new Error("Moderator aggregate activity was unavailable");
  const report = moderator.locator("li").filter({
    hasText: "Fictional moderator workflow QA report",
  });
  await report
    .getByLabel("Reason for the audit record")
    .fill("Reviewed fictional QA report with no action");
  await report.getByRole("button", { name: "Save decision" }).click();
  await moderator.waitForURL(/status=reviewed/, { timeout: 20000 });
  await moderator
    .getByText("Reviewed fictional QA report with no action")
    .waitFor();
  const reports = await admin
    .from("reports")
    .select("id,status")
    .eq("reporter_id", users[1]);
  if (
    reports.error ||
    reports.data.length !== 1 ||
    reports.data[0].status !== "dismissed"
  )
    throw new Error("Moderation decision was not recorded");
  const actions = await admin
    .from("moderation_actions")
    .select("id")
    .eq("report_id", reports.data[0].id)
    .eq("actor_id", users[2]);
  if (actions.error || actions.data.length !== 1)
    throw new Error("Moderator audit record was not created");
  console.log("Moderator access, report dismissal and audit passed");

  await participant.goto(
    `http://localhost:3000/community/report?kind=profile&id=${users[3]}`,
  );
  await participant
    .getByLabel("What happened?")
    .fill("Fictional account suspension QA report");
  await participant.getByRole("button", { name: "Submit report" }).click();
  await participant.waitForURL(/status=sent/, { timeout: 20000 });
  await moderator.goto("http://localhost:3000/community/moderation");
  const profileReport = moderator.locator("li").filter({
    hasText: "Fictional account suspension QA report",
  });
  await profileReport.getByLabel("Decision").selectOption("suspend");
  await profileReport
    .getByLabel("Reason for the audit record")
    .fill("Suspending fictional QA profile to verify access denial");
  await profileReport.getByRole("button", { name: "Save decision" }).click();
  await moderator.waitForURL(/status=reviewed/, { timeout: 20000 });
  await competitor.goto("http://localhost:3000/community");
  await competitor.waitForURL("**/community/onboarding", { timeout: 20000 });
  await competitor
    .getByText("This account is suspended.", { exact: false })
    .waitFor();
  console.log("Account suspension denied community access");
} finally {
  await browser?.close();
  for (const id of users) {
    for (const reportId of await ids("reports", "reporter_id", id)) {
      await remove("moderation_actions", "report_id", reportId);
      await remove("reports", "id", reportId);
    }
  }
  if (testZoneId) {
    await remove("campus_management_actions", "zone_id", testZoneId);
    await remove("location_zones", "id", testZoneId);
  }
  for (const id of users) {
    for (const itemId of await ids("item_requests", "requester_id", id)) {
      await remove("item_fulfilments", "request_id", itemId);
      await remove("item_requests", "id", itemId);
    }
  }
  for (const id of users) {
    const tripIds = await ids("trips", "organizer_id", id);
    for (const tripId of tripIds) {
      const legIds = await ids("journey_legs", "trip_id", tripId);
      for (const legId of legIds) {
        const requestIds = await ids("join_requests", "leg_id", legId);
        for (const requestId of requestIds) {
          const conversationIds = await ids(
            "conversations",
            "context_id",
            requestId,
          );
          for (const conversationId of conversationIds) {
            await remove(
              "conversation_reads",
              "conversation_id",
              conversationId,
            );
            await remove("messages", "conversation_id", conversationId);
            await remove("conversations", "id", conversationId);
          }
          await remove("leg_participants", "join_request_id", requestId);
          await remove("join_requests", "id", requestId);
        }
        await remove("journey_legs", "id", legId);
      }
      await remove("trips", "id", tripId);
    }
  }
  for (const id of users) {
    await remove("notifications", "recipient_id", id);
    const deleted = await admin.auth.admin.deleteUser(id);
    if (deleted.error)
      throw new Error(`Test identity cleanup: ${deleted.error.code}`);
  }
  if (users.length)
    console.log("Temporary interaction data and identities removed");
}
