// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const alice = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";
const outsider = "00000000-0000-4000-8000-000000000003";

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
  `);
  const migration = await readFile(
    join(process.cwd(), "supabase/migrations/20261018150000_foundation.sql"),
    "utf8",
  );
  await db.exec(migration);
  const profileMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261018160000_profile_functions.sql",
    ),
    "utf8",
  );
  await db.exec(profileMigration);
  const tripMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261018170000_trip_functions.sql",
    ),
    "utf8",
  );
  await db.exec(tripMigration);
  const zonesMigration = await readFile(
    join(process.cwd(), "supabase/migrations/20261018171000_seed_zones.sql"),
    "utf8",
  );
  await db.exec(zonesMigration);
  const itemMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261018180000_item_functions.sql",
    ),
    "utf8",
  );
  await db.exec(itemMigration);
  const itemEditMigration = await readFile(
    join(process.cwd(), "supabase/migrations/20261018181000_item_edit.sql"),
    "utf8",
  );
  await db.exec(itemEditMigration);
  const messageMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261018190000_messaging_functions.sql",
    ),
    "utf8",
  );
  await db.exec(messageMigration);
  const unreadMigration = await readFile(
    join(process.cwd(), "supabase/migrations/20261018191000_unread_counts.sql"),
    "utf8",
  );
  await db.exec(unreadMigration);
  const notificationMigration = await readFile(
    join(process.cwd(), "supabase/migrations/20261018200000_notifications.sql"),
    "utf8",
  );
  await db.exec(notificationMigration);
  const moderationMigration = await readFile(
    join(process.cwd(), "supabase/migrations/20261018210000_moderation.sql"),
    "utf8",
  );
  await db.exec(moderationMigration);
  const limitMigration = await readFile(
    join(process.cwd(), "supabase/migrations/20261018220000_write_limits.sql"),
    "utf8",
  );
  await db.exec(limitMigration);
  const maintenanceMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261018230000_expiration_and_moderation.sql",
    ),
    "utf8",
  );
  await db.exec(maintenanceMigration);
  const tripExpirationMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261018231000_trip_expiration.sql",
    ),
    "utf8",
  );
  await db.exec(tripExpirationMigration);
  const reportsPolicyMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261019010000_reports_rls_performance.sql",
    ),
    "utf8",
  );
  await db.exec(reportsPolicyMigration);
  const pushSubscriptionMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261019030000_push_subscriptions.sql",
    ),
    "utf8",
  );
  await db.exec(pushSubscriptionMigration);
  const pushQueueMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261019040000_push_delivery_queue.sql",
    ),
    "utf8",
  );
  await db.exec(pushQueueMigration);
  const metricsMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261020000000_product_metrics.sql",
    ),
    "utf8",
  );
  await db.exec(metricsMigration);
  const zoneManagementMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261020010000_zone_management.sql",
    ),
    "utf8",
  );
  await db.exec(zoneManagementMigration);
  const campusEmailMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261021000000_recheck_campus_email.sql",
    ),
    "utf8",
  );
  await db.exec(campusEmailMigration);
  const offerTripMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261021010000_recheck_item_offer_trip.sql",
    ),
    "utf8",
  );
  await db.exec(offerTripMigration);
  const counterpartyMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261021020000_recheck_counterparty_membership.sql",
    ),
    "utf8",
  );
  await db.exec(counterpartyMigration);
  const matchOpenMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261021030000_match_open_metric.sql",
    ),
    "utf8",
  );
  await db.exec(matchOpenMigration);
  const retentionMigration = await readFile(
    join(
      process.cwd(),
      "supabase/migrations/20261027000000_account_deletion_and_retention.sql",
    ),
    "utf8",
  );
  await db.exec(retentionMigration);
  const askMigration = await readFile(
    join(process.cwd(), "supabase/migrations/20261028000000_ask_to_carry.sql"),
    "utf8",
  );
  await db.exec(askMigration);
  await db.exec(`
    insert into auth.users(id,email,email_confirmed_at) values
      ('${alice}','alice@iiti.ac.in',now()),
      ('${bob}','bob@iiti.ac.in',now()),
      ('${outsider}','outsider@example.edu',now());
    insert into public.campuses(code,name) values ('other', 'Other Campus');
    insert into public.campus_domains(domain,campus_id,enabled)
    select 'example.edu', id, true from public.campuses where code='other';
    insert into public.profiles(user_id,campus_id,display_name)
    select '${alice}', id, 'Alice' from public.campuses where code='iiti';
    insert into public.profiles(user_id,campus_id,display_name)
    select '${bob}', id, 'Bob' from public.campuses where code='iiti';
    insert into public.profiles(user_id,campus_id,display_name)
    select '${outsider}', id, 'Outsider' from public.campuses where code='other';
    insert into public.trips(campus_id,organizer_id)
    select campus_id, user_id from public.profiles where user_id='${alice}';
    insert into public.trips(campus_id,organizer_id)
    select campus_id, user_id from public.profiles where user_id='${outsider}';
    insert into public.conversations(campus_id,context_kind,context_id,member_a,member_b)
    select campus_id, 'join', '00000000-0000-4000-8000-000000000010', '${alice}', '${bob}'
    from public.profiles where user_id='${alice}';
    insert into public.messages(conversation_id,sender_id,body,client_nonce)
    select id, '${alice}', 'Test message', '00000000-0000-4000-8000-000000000011'
    from public.conversations;
    insert into public.notifications(recipient_id,kind,dedupe_key)
    values ('${alice}', 'test', 'fixture-alice');
  `);
}, 30000);

afterAll(async () => db?.close());

async function asUser<T>(userId: string, query: string): Promise<T[]> {
  await db.exec(
    `set role authenticated; set request.jwt.claim.sub = '${userId}';`,
  );
  try {
    const result = await db.query<T>(query);
    return result.rows;
  } finally {
    await db.exec("reset role; reset request.jwt.claim.sub;");
  }
}

describe("foundation migration and grants", () => {
  it("records only aggregate trip creation and restricts metrics to moderators", async () => {
    const counts = await db.query<{ event: string; count: string }>(
      "select event,count from public.daily_product_metrics where event='trip_created' order by count",
    );
    expect(counts.rows.map((row) => Number(row.count))).toEqual([1, 1]);
    expect(
      await asUser(alice, "select * from public.daily_product_metrics"),
    ).toEqual([]);
    await db.exec(
      `update public.profiles set role='moderator' where user_id='${alice}'`,
    );
    try {
      const own = await asUser<{ count: string }>(
        alice,
        "select count from public.daily_product_metrics where event='trip_created'",
      );
      expect(own).toHaveLength(1);
      expect(Number(own[0].count)).toBe(1);
    } finally {
      await db.exec(
        `update public.profiles set role='member' where user_id='${alice}'`,
      );
    }
  });

  it("counts workflow transitions once without retaining actor or post IDs", async () => {
    await db.exec("begin");
    try {
      await db.exec(`
        insert into public.journey_legs(id,trip_id,campus_id,direction,origin_zone_id,destination_zone_id,departure_at,seats_available)
        select '00000000-0000-4000-8000-000000000020', t.id, t.campus_id, 'outward',
          (select id from public.location_zones where campus_id=t.campus_id order by label limit 1),
          (select id from public.location_zones where campus_id=t.campus_id order by label offset 1 limit 1),
          now()+interval '1 day', 2
        from public.trips t where t.organizer_id='${alice}' limit 1;
        insert into public.join_requests(id,leg_id,requester_id)
        values ('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000020','${bob}');
        update public.join_requests set status='accepted'
        where id='00000000-0000-4000-8000-000000000021';
        update public.join_requests set status='accepted'
        where id='00000000-0000-4000-8000-000000000021';
        insert into public.item_requests(id,campus_id,requester_id,preferred_zone_id,description,quantity,budget_limit,deadline_at)
        select '00000000-0000-4000-8000-000000000022', p.campus_id, p.user_id,
          (select id from public.location_zones where campus_id=p.campus_id limit 1),
          'Fictional notebook', 1, 100, now()+interval '1 day'
        from public.profiles p where p.user_id='${bob}';
        update public.item_requests set status='completed'
        where id='00000000-0000-4000-8000-000000000022';
        update public.trips set status='completed' where organizer_id='${alice}';
      `);
      const result = await db.query<{ event: string; count: string }>(`
        select event,count from public.daily_product_metrics m
        join public.campuses c on c.id=m.campus_id where c.code='iiti'
      `);
      expect(
        Object.fromEntries(
          result.rows.map((row) => [row.event, Number(row.count)]),
        ),
      ).toMatchObject({
        trip_created: 1,
        join_requested: 1,
        join_accepted: 1,
        item_created: 1,
        item_completed: 1,
        trip_completed: 1,
      });
    } finally {
      await db.exec("rollback");
    }
  });

  it("restricts zone changes to moderators and records an audit", async () => {
    await db.exec("begin");
    try {
      const result = await db.query<{ id: string }>(`
        select z.id from public.location_zones z
        join public.campuses c on c.id=z.campus_id
        where c.code='iiti' order by z.label limit 1
      `);
      const zoneId = result.rows[0].id;
      const before = await asUser<{ id: string }>(
        bob,
        "select id from public.location_zones",
      );
      await db.exec(
        `set role authenticated; set request.jwt.claim.sub='${bob}'; savepoint member_denial;`,
      );
      await expect(
        db.query(
          `select public.set_zone_active('${zoneId}',false,'Fictional QA zone update')`,
        ),
      ).rejects.toThrow();
      await db.exec(
        "rollback to savepoint member_denial; reset role; reset request.jwt.claim.sub;",
      );
      await db.exec(
        `update public.profiles set role='moderator' where user_id='${alice}'`,
      );
      await db.exec(`
        insert into public.journey_legs(id,trip_id,campus_id,direction,origin_zone_id,destination_zone_id,departure_at,seats_available)
        select '00000000-0000-4000-8000-000000000025', t.id, t.campus_id, 'outward',
          '${zoneId}',
          (select id from public.location_zones where campus_id=t.campus_id and id<>'${zoneId}' limit 1),
          now()+interval '1 day', 1
        from public.trips t where t.organizer_id='${alice}' limit 1;
        set role authenticated; set request.jwt.claim.sub='${alice}'; savepoint active_workflow_denial;
      `);
      await expect(
        db.query(
          `select public.set_zone_active('${zoneId}',false,'Fictional QA zone update')`,
        ),
      ).rejects.toThrow();
      await db.exec(
        "rollback to savepoint active_workflow_denial; reset role; reset request.jwt.claim.sub;",
      );
      await db.exec(
        "delete from public.journey_legs where id='00000000-0000-4000-8000-000000000025'",
      );
      await asUser(
        alice,
        `select public.set_zone_active('${zoneId}',false,'Fictional QA zone update')`,
      );
      const after = await asUser<{ id: string }>(
        bob,
        "select id from public.location_zones",
      );
      expect(after).toHaveLength(before.length - 1);
      expect(
        await asUser<{ id: string }>(
          alice,
          `select id from public.location_zones where id='${zoneId}'`,
        ),
      ).toHaveLength(1);
      expect(
        await asUser(bob, "select * from public.campus_management_actions"),
      ).toEqual([]);
      expect(
        await asUser(alice, "select id from public.campus_management_actions"),
      ).toHaveLength(1);
      await asUser(
        alice,
        `select public.set_zone_active('${zoneId}',true,'Restoring fictional QA zone')`,
      );
    } finally {
      await db.exec("rollback");
    }
  });
  it("limits same-campus discovery and hides another campus", async () => {
    const rows = await asUser<{ organizer_id: string }>(
      bob,
      "select organizer_id from public.trips",
    );
    expect(rows).toEqual([{ organizer_id: alice }]);
  });

  it("denies anonymous reads and direct member writes", async () => {
    await db.exec("set role anon");
    await expect(db.query("select * from public.trips")).rejects.toThrow();
    await db.exec("reset role");
    await db.exec(
      `set role authenticated; set request.jwt.claim.sub = '${bob}';`,
    );
    await expect(db.query("delete from public.trips")).rejects.toThrow();
    await db.exec("reset role; reset request.jwt.claim.sub;");
  });

  it("keeps own profile readable while excluding another campus", async () => {
    const rows = await asUser<{ user_id: string }>(
      alice,
      "select user_id from public.profiles order by user_id",
    );
    expect(rows.map((row) => row.user_id)).toEqual([alice, bob]);
  });

  it("revokes campus reads when a confirmed email changes outside its campus domain", async () => {
    await db.exec(
      `update auth.users set email='alice@example.edu' where id='${alice}'`,
    );
    try {
      expect(await asUser(alice, "select id from public.trips")).toEqual([]);
      await expect(
        asUser(alice, "select public.create_trip('[]'::jsonb, false, null)"),
      ).rejects.toThrow();
    } finally {
      await db.exec(
        `update auth.users set email='alice@iiti.ac.in' where id='${alice}'`,
      );
    }
  });

  it("restricts messages and notifications to their parties", async () => {
    expect((await asUser(bob, "select body from public.messages")).length).toBe(
      1,
    );
    expect(
      (await asUser(outsider, "select body from public.messages")).length,
    ).toBe(0);
    expect(
      (await asUser(bob, "select kind from public.notifications")).length,
    ).toBe(1);
    expect(
      (await asUser(alice, "select kind from public.notifications")).length,
    ).toBe(1);
  });

  it("enables RLS on every app table", async () => {
    const result = await db.query<{
      relname: string;
      relrowsecurity: boolean;
    }>(`
      select c.relname, c.relrowsecurity from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    `);
    expect(result.rows).toHaveLength(21);
    expect(result.rows.every((row) => row.relrowsecurity)).toBe(true);
  });

  it("creates a profile only for a confirmed permitted email", async () => {
    const accepted = "00000000-0000-4000-8000-000000000021";
    const unconfirmed = "00000000-0000-4000-8000-000000000022";
    const wrongDomain = "00000000-0000-4000-8000-000000000023";
    await db.exec(`
      insert into auth.users(id,email,email_confirmed_at) values
        ('${accepted}','new@iiti.ac.in',now()),
        ('${unconfirmed}','wait@iiti.ac.in',null),
        ('${wrongDomain}','wrong@unlisted.test',now());
    `);
    await asUser(accepted, "select public.create_own_profile('New Member')");
    expect(
      (
        await asUser(
          accepted,
          "select display_name from public.profiles where user_id = auth.uid()",
        )
      )[0],
    ).toEqual({ display_name: "New Member" });
    await expect(
      asUser(unconfirmed, "select public.create_own_profile('Waiting Member')"),
    ).rejects.toThrow();
    await expect(
      asUser(wrongDomain, "select public.create_own_profile('Wrong Domain')"),
    ).rejects.toThrow();
  });

  it("enforces trip ownership and a final seat inside RPCs", async () => {
    const zones = await db.query<{ id: string }>(`
      insert into public.location_zones(campus_id,label)
      select id, 'Campus' from public.campuses where code='iiti' returning id;
    `);
    const city = await db.query<{ id: string }>(`
      insert into public.location_zones(campus_id,label)
      select id, 'City' from public.campuses where code='iiti' returning id;
    `);
    const legs = JSON.stringify([
      {
        direction: "outward",
        origin_zone_id: zones.rows[0].id,
        destination_zone_id: city.rows[0].id,
        departure_at: "2099-01-01T10:00:00Z",
        seats_available: 1,
        fare_estimate: 600,
      },
    ]);
    // Use a bounded near-future date rather than a fixed year beyond the one-year rule.
    const validLegs = legs.replace(
      "2099-01-01T10:00:00Z",
      new Date(Date.now() + 86400000).toISOString(),
    );
    const trip = await asUser<{ create_trip: string }>(
      alice,
      `select public.create_trip('${validLegs}'::jsonb, false, null)`,
    );
    const leg = await db.query<{ id: string }>(
      `select id from public.journey_legs where trip_id='${trip[0].create_trip}'`,
    );
    await expect(
      asUser(alice, `select public.request_join('${leg.rows[0].id}')`),
    ).rejects.toThrow();
    const request = await asUser<{ request_join: string }>(
      bob,
      `select public.request_join('${leg.rows[0].id}')`,
    );
    await expect(
      asUser(
        outsider,
        `select public.decide_join('${request[0].request_join}', true)`,
      ),
    ).rejects.toThrow();
    await asUser(
      alice,
      `select public.decide_join('${request[0].request_join}', true)`,
    );
    const participants = await db.query<{ user_id: string }>(
      `select user_id from public.leg_participants where leg_id='${leg.rows[0].id}'`,
    );
    expect(participants.rows).toEqual([{ user_id: bob }]);
    await expect(
      asUser(
        alice,
        `select public.update_leg('${leg.rows[0].id}',now()+interval '2 days',2,700)`,
      ),
    ).rejects.toThrow();
    await expect(
      asUser(
        bob,
        `select public.update_trip('${trip[0].create_trip}',1,true,'Changed by passenger')`,
      ),
    ).rejects.toThrow();
    await asUser(
      alice,
      `select public.update_trip('${trip[0].create_trip}',1,true,'Updated by organizer')`,
    );
    await expect(
      asUser(
        alice,
        `select public.update_trip('${trip[0].create_trip}',1,false,'Stale edit')`,
      ),
    ).rejects.toThrow();
    const conversation = await asUser<{ open_conversation: string }>(
      bob,
      `select public.open_conversation('join','${request[0].request_join}')`,
    );
    const nonce = "00000000-0000-4000-8000-000000000050";
    const first = await asUser<{ send_message: number }>(
      bob,
      `select public.send_message('${conversation[0].open_conversation}','Going together','${nonce}')`,
    );
    const duplicate = await asUser<{ send_message: number }>(
      bob,
      `select public.send_message('${conversation[0].open_conversation}','Going together','${nonce}')`,
    );
    expect(duplicate[0].send_message).toBe(first[0].send_message);
    await expect(
      asUser(
        outsider,
        `select public.send_message('${conversation[0].open_conversation}','Intrusion','00000000-0000-4000-8000-000000000051')`,
      ),
    ).rejects.toThrow();
  });

  it("stores distinct outward and return seats and rejects an invalid return", async () => {
    const zones = await db.query<{ id: string; label: string }>(
      "select id,label from public.location_zones where label in ('IIT Indore Campus','Vijay Nagar')",
    );
    const campus = zones.rows.find(
      (zone) => zone.label === "IIT Indore Campus",
    )!.id;
    const city = zones.rows.find((zone) => zone.label === "Vijay Nagar")!.id;
    const outward = new Date(Date.now() + 86400000).toISOString();
    const returning = new Date(Date.now() + 172800000).toISOString();
    const legs = JSON.stringify([
      {
        direction: "outward",
        origin_zone_id: campus,
        destination_zone_id: city,
        departure_at: outward,
        seats_available: 2,
        fare_estimate: 500,
      },
      {
        direction: "return",
        origin_zone_id: city,
        destination_zone_id: campus,
        departure_at: returning,
        seats_available: 1,
        fare_estimate: 650,
      },
    ]);
    const trip = await asUser<{ create_trip: string }>(
      alice,
      `select public.create_trip('${legs}'::jsonb,false,null)`,
    );
    const saved = await db.query<{
      direction: string;
      seats_available: number;
    }>(
      `select direction,seats_available from public.journey_legs where trip_id='${trip[0].create_trip}' order by direction`,
    );
    expect(saved.rows).toEqual([
      { direction: "outward", seats_available: 2 },
      { direction: "return", seats_available: 1 },
    ]);
    const invalid = JSON.stringify([
      {
        direction: "outward",
        origin_zone_id: campus,
        destination_zone_id: city,
        departure_at: outward,
        seats_available: 2,
      },
      {
        direction: "return",
        origin_zone_id: city,
        destination_zone_id: campus,
        departure_at: outward,
        seats_available: 1,
      },
    ]);
    await expect(
      asUser(
        alice,
        `select public.create_trip('${invalid}'::jsonb,false,null)`,
      ),
    ).rejects.toThrow();
  });

  it("does not award a seat to a suspended applicant", async () => {
    const zone = await db.query<{ id: string }>(
      "select id from public.location_zones where label in ('IIT Indore Campus','Vijay Nagar') order by label",
    );
    const departure = new Date(Date.now() + 86400000).toISOString();
    const legs = JSON.stringify([
      {
        direction: "outward",
        origin_zone_id: zone.rows[0].id,
        destination_zone_id: zone.rows[1].id,
        departure_at: departure,
        seats_available: 1,
      },
    ]);
    const trip = await asUser<{ create_trip: string }>(
      alice,
      `select public.create_trip('${legs}'::jsonb,false,null)`,
    );
    const leg = await db.query<{ id: string }>(
      `select id from public.journey_legs where trip_id='${trip[0].create_trip}'`,
    );
    const request = await asUser<{ request_join: string }>(
      bob,
      `select public.request_join('${leg.rows[0].id}')`,
    );
    await db.exec(
      `update public.profiles set status='suspended' where user_id='${bob}'`,
    );
    try {
      await expect(
        asUser(
          alice,
          `select public.decide_join('${request[0].request_join}',true)`,
        ),
      ).rejects.toThrow();
      const participants = await db.query<{ user_id: string }>(
        `select user_id from public.leg_participants where leg_id='${leg.rows[0].id}'`,
      );
      expect(participants.rows).toEqual([]);
    } finally {
      await db.exec(
        `update public.profiles set status='active' where user_id='${bob}'`,
      );
    }
  });

  it("keeps one accepted item fulfilment and enforces the handover state", async () => {
    const zones = await db.query<{ id: string; label: string }>(
      "select id,label from public.location_zones where label in ('IIT Indore Campus','Vijay Nagar')",
    );
    const campusZone = zones.rows.find(
      (zone) => zone.label === "IIT Indore Campus",
    )!.id;
    const cityZone = zones.rows.find(
      (zone) => zone.label === "Vijay Nagar",
    )!.id;
    const departure = new Date(Date.now() + 86400000).toISOString();
    const deadline = new Date(Date.now() + 172800000).toISOString();
    const legs = JSON.stringify([
      {
        direction: "outward",
        origin_zone_id: campusZone,
        destination_zone_id: cityZone,
        departure_at: departure,
        seats_available: 2,
        fare_estimate: 500,
      },
    ]);
    const trip = await asUser<{ create_trip: string }>(
      alice,
      `select public.create_trip('${legs}'::jsonb,true,null)`,
    );
    const leg = await db.query<{ id: string }>(
      `select id from public.journey_legs where trip_id='${trip[0].create_trip}'`,
    );
    const item = await asUser<{ create_item_request: string }>(
      bob,
      `select public.create_item_request('${cityZone}','A textbook from the city',1,1000,'${deadline}',null)`,
    );
    const wrongLegs = JSON.stringify([
      {
        direction: "outward",
        origin_zone_id: cityZone,
        destination_zone_id: campusZone,
        departure_at: departure,
        seats_available: 2,
        fare_estimate: 500,
      },
    ]);
    const wrongTrip = await asUser<{ create_trip: string }>(
      alice,
      `select public.create_trip('${wrongLegs}'::jsonb,true,null)`,
    );
    const wrongLeg = await db.query<{ id: string }>(
      `select id from public.journey_legs where trip_id='${wrongTrip[0].create_trip}'`,
    );
    await expect(
      asUser(
        alice,
        `select public.offer_item('${item[0].create_item_request}','${wrongLeg.rows[0].id}')`,
      ),
    ).rejects.toThrow();
    await expect(
      asUser(
        alice,
        `select public.update_item_request('${item[0].create_item_request}',1,'${cityZone}','Wrong owner edit',1,900,'${deadline}',null)`,
      ),
    ).rejects.toThrow();
    await asUser(
      bob,
      `select public.update_item_request('${item[0].create_item_request}',1,'${cityZone}','A revised textbook request',1,900,'${deadline}',null)`,
    );
    await expect(
      asUser(
        bob,
        `select public.update_item_request('${item[0].create_item_request}',1,'${cityZone}','Stale request edit',1,900,'${deadline}',null)`,
      ),
    ).rejects.toThrow();
    await expect(
      asUser(
        outsider,
        `select public.offer_item('${item[0].create_item_request}','${leg.rows[0].id}')`,
      ),
    ).rejects.toThrow();
    const offer = await asUser<{ offer_item: string }>(
      alice,
      `select public.offer_item('${item[0].create_item_request}','${leg.rows[0].id}')`,
    );
    await expect(
      asUser(
        bob,
        `select public.update_item_request('${item[0].create_item_request}',2,'${cityZone}','Edit after offer',1,900,'${deadline}',null)`,
      ),
    ).rejects.toThrow();
    await expect(
      asUser(
        alice,
        `select public.accept_item_offer('${offer[0].offer_item}','Agreed textbook',500)`,
      ),
    ).rejects.toThrow();
    await asUser(
      bob,
      `select public.accept_item_offer('${offer[0].offer_item}','Agreed textbook',500)`,
    );
    await expect(
      asUser(
        bob,
        `select public.set_item_status('${item[0].create_item_request}','completed')`,
      ),
    ).rejects.toThrow();
    await asUser(
      alice,
      `select public.set_item_status('${item[0].create_item_request}','purchased')`,
    );
    await asUser(
      alice,
      `select public.set_item_status('${item[0].create_item_request}','ready')`,
    );
    await asUser(
      bob,
      `select public.set_item_status('${item[0].create_item_request}','completed')`,
    );
    const state = await db.query<{ status: string }>(
      `select status from public.item_requests where id='${item[0].create_item_request}'`,
    );
    expect(state.rows[0].status).toBe("completed");
    const another = await asUser<{ create_item_request: string }>(
      bob,
      `select public.create_item_request('${cityZone}','Another textbook',1,1000,'${deadline}',null)`,
    );
    const declined = await asUser<{ offer_item: string }>(
      alice,
      `select public.offer_item('${another[0].create_item_request}','${leg.rows[0].id}')`,
    );
    await expect(
      asUser(
        alice,
        `select public.decline_item_offer('${declined[0].offer_item}')`,
      ),
    ).rejects.toThrow();
    await asUser(
      bob,
      `select public.decline_item_offer('${declined[0].offer_item}')`,
    );
  });

  it("rejects an offer after its traveller cancels the supporting trip", async () => {
    const zones = await db.query<{ id: string; label: string }>(
      "select id,label from public.location_zones where label in ('IIT Indore Campus','Vijay Nagar')",
    );
    const campusZone = zones.rows.find(
      (zone) => zone.label === "IIT Indore Campus",
    )!.id;
    const cityZone = zones.rows.find(
      (zone) => zone.label === "Vijay Nagar",
    )!.id;
    const departure = new Date(Date.now() + 86400000).toISOString();
    const deadline = new Date(Date.now() + 172800000).toISOString();
    const legs = JSON.stringify([
      {
        direction: "outward",
        origin_zone_id: campusZone,
        destination_zone_id: cityZone,
        departure_at: departure,
        seats_available: 1,
      },
    ]);
    const trip = await asUser<{ create_trip: string }>(
      alice,
      `select public.create_trip('${legs}'::jsonb,true,null)`,
    );
    const leg = await db.query<{ id: string }>(
      `select id from public.journey_legs where trip_id='${trip[0].create_trip}'`,
    );
    const item = await asUser<{ create_item_request: string }>(
      bob,
      `select public.create_item_request('${cityZone}','Fictional cancelled-trip item',1,1000,'${deadline}',null)`,
    );
    const offer = await asUser<{ offer_item: string }>(
      alice,
      `select public.offer_item('${item[0].create_item_request}','${leg.rows[0].id}')`,
    );
    await asUser(
      alice,
      `select public.set_trip_status('${trip[0].create_trip}','cancelled')`,
    );
    await expect(
      asUser(
        bob,
        `select public.accept_item_offer('${offer[0].offer_item}','Agreed fictional item',500)`,
      ),
    ).rejects.toThrow();
  });

  it("does not accept an offer from a suspended traveller", async () => {
    const zones = await db.query<{ id: string; label: string }>(
      "select id,label from public.location_zones where label in ('IIT Indore Campus','Vijay Nagar')",
    );
    const campusZone = zones.rows.find(
      (zone) => zone.label === "IIT Indore Campus",
    )!.id;
    const cityZone = zones.rows.find(
      (zone) => zone.label === "Vijay Nagar",
    )!.id;
    const departure = new Date(Date.now() + 86400000).toISOString();
    const deadline = new Date(Date.now() + 172800000).toISOString();
    const legs = JSON.stringify([
      {
        direction: "outward",
        origin_zone_id: campusZone,
        destination_zone_id: cityZone,
        departure_at: departure,
        seats_available: 1,
      },
    ]);
    const trip = await asUser<{ create_trip: string }>(
      alice,
      `select public.create_trip('${legs}'::jsonb,true,null)`,
    );
    const leg = await db.query<{ id: string }>(
      `select id from public.journey_legs where trip_id='${trip[0].create_trip}'`,
    );
    const item = await asUser<{ create_item_request: string }>(
      bob,
      `select public.create_item_request('${cityZone}','Fictional suspended-traveller item',1,1000,'${deadline}',null)`,
    );
    const offer = await asUser<{ offer_item: string }>(
      alice,
      `select public.offer_item('${item[0].create_item_request}','${leg.rows[0].id}')`,
    );
    await db.exec(
      `update public.profiles set status='suspended' where user_id='${alice}'`,
    );
    try {
      await expect(
        asUser(
          bob,
          `select public.accept_item_offer('${offer[0].offer_item}','Agreed fictional item',500)`,
        ),
      ).rejects.toThrow();
      const state = await db.query<{ status: string }>(
        `select status from public.item_fulfilments where id='${offer[0].offer_item}'`,
      );
      expect(state.rows[0].status).toBe("offered");
    } finally {
      await db.exec(
        `update public.profiles set status='active' where user_id='${alice}'`,
      );
    }
  });

  it("generates private workflow notifications and rejects another recipient's read", async () => {
    const notifications = await asUser<{ kind: string; id: number }>(
      alice,
      "select id,kind from public.notifications where kind='join_request' order by id desc limit 1",
    );
    expect(notifications[0]?.kind).toBe("join_request");
    await expect(
      asUser(
        bob,
        `select public.mark_notification_read(${notifications[0].id})`,
      ),
    ).rejects.toThrow();
    await asUser(
      alice,
      `select public.mark_notification_read(${notifications[0].id})`,
    );
    const read = await asUser<{ read_at: string }>(
      alice,
      `select read_at from public.notifications where id=${notifications[0].id}`,
    );
    expect(read[0].read_at).toBeTruthy();
    const messages = await asUser<{ kind: string }>(
      alice,
      "select kind from public.notifications where kind='message'",
    );
    expect(messages.length).toBeGreaterThan(0);
  });

  it("counts only incoming unread messages", async () => {
    const counts = await asUser<{ unread_count: number }>(
      bob,
      "select unread_count from public.conversation_unread_counts() order by unread_count desc limit 1",
    );
    expect(Number(counts[0].unread_count)).toBeGreaterThan(0);
    const conversation = await asUser<{ id: string }>(
      bob,
      "select id from public.conversations order by created_at limit 1",
    );
    const latest = await asUser<{ id: number }>(
      bob,
      `select id from public.messages where conversation_id='${conversation[0].id}' order by id desc limit 1`,
    );
    await asUser(
      bob,
      `select public.mark_conversation_read('${conversation[0].id}',${latest[0].id})`,
    );
    const after = await asUser<{ unread_count: number }>(
      bob,
      `select unread_count from public.conversation_unread_counts() where conversation_id='${conversation[0].id}'`,
    );
    expect(Number(after[0].unread_count)).toBe(0);
  });

  it("restricts reports, blocks, and moderator actions by campus and role", async () => {
    await expect(
      asUser(
        bob,
        `select public.report_content('profile','${outsider}','Cross-campus report')`,
      ),
    ).rejects.toThrow();
    await expect(
      asUser(bob, `select public.block_member('${outsider}')`),
    ).rejects.toThrow();
    await asUser(bob, `select public.block_member('${alice}')`);
    expect(
      await asUser<{ blocked_id: string }>(
        bob,
        "select blocked_id from public.blocks",
      ),
    ).toEqual([{ blocked_id: alice }]);
    await asUser(bob, `select public.unblock_member('${alice}')`);
    const report = await asUser<{ report_content: string }>(
      bob,
      `select public.report_content('profile','${alice}','Repeated unwanted contact')`,
    );
    await expect(
      asUser(
        bob,
        `select public.review_report('${report[0].report_content}','suspend','Repeated unwanted contact')`,
      ),
    ).rejects.toThrow();
    await db.exec(
      `update public.profiles set role='moderator' where user_id='${alice}'`,
    );
    await asUser(
      alice,
      `select public.review_report('${report[0].report_content}','dismiss','Insufficient evidence')`,
    );
    const actions = await asUser<{ action: string }>(
      alice,
      "select action from public.moderation_actions",
    );
    expect(actions).toEqual([{ action: "dismiss" }]);
    expect(
      await asUser<{ action: string }>(
        outsider,
        "select action from public.moderation_actions",
      ),
    ).toEqual([]);
  });

  it("expires only open items and cancels their unaccepted offers", async () => {
    const item = await db.query<{ id: string }>(`
      insert into public.item_requests(campus_id,requester_id,preferred_zone_id,description,quantity,budget_limit,deadline_at)
      select p.campus_id,p.user_id,z.id,'Expired test item',1,100,now()-interval '1 minute'
      from public.profiles p join public.location_zones z on z.campus_id=p.campus_id
      where p.user_id='${bob}' and z.label='Vijay Nagar' returning id
    `);
    const leg = await db.query<{ id: string }>(`
      select l.id from public.journey_legs l join public.trips t on t.id=l.trip_id
      where t.organizer_id='${alice}' and l.status='open' limit 1
    `);
    await db.exec(`insert into public.item_fulfilments(request_id,traveller_id,leg_id)
      values('${item.rows[0].id}','${alice}','${leg.rows[0].id}')`);
    const active = await db.query<{ id: string }>(`
      insert into public.item_requests(campus_id,requester_id,preferred_zone_id,description,quantity,budget_limit,deadline_at,status)
      select p.campus_id,p.user_id,z.id,'Purchased test item',1,100,now()-interval '1 minute','purchased'
      from public.profiles p join public.location_zones z on z.campus_id=p.campus_id
      where p.user_id='${bob}' and z.label='Vijay Nagar' returning id
    `);
    await db.query("select private.expire_open_items()");
    const rows = await db.query<{ id: string; status: string }>(`
      select id,status from public.item_requests where id in ('${item.rows[0].id}','${active.rows[0].id}')
    `);
    expect(rows.rows.find((row) => row.id === item.rows[0].id)?.status).toBe(
      "expired",
    );
    expect(rows.rows.find((row) => row.id === active.rows[0].id)?.status).toBe(
      "purchased",
    );
    const offer = await db.query<{ status: string }>(
      `select status from public.item_fulfilments where request_id='${item.rows[0].id}'`,
    );
    expect(offer.rows[0].status).toBe("cancelled");
    await expect(
      asUser(bob, "select private.expire_open_items()"),
    ).rejects.toThrow();
  });

  it("expires departed legs and preserves a future return leg", async () => {
    const trip = await db.query<{ id: string; campus_id: string }>(`
      insert into public.trips(campus_id,organizer_id)
      select campus_id,user_id from public.profiles where user_id='${alice}'
      returning id,campus_id
    `);
    const zones = await db.query<{ id: string; label: string }>(`
      select id,label from public.location_zones
      where campus_id='${trip.rows[0].campus_id}'
        and label in ('IIT Indore Campus','Vijay Nagar')
    `);
    const campus = zones.rows.find(
      (zone) => zone.label === "IIT Indore Campus",
    )!.id;
    const city = zones.rows.find((zone) => zone.label === "Vijay Nagar")!.id;
    await db.exec(`
      insert into public.journey_legs(trip_id,campus_id,direction,origin_zone_id,destination_zone_id,departure_at,seats_available)
      values
        ('${trip.rows[0].id}','${trip.rows[0].campus_id}','outward','${campus}','${city}',now()-interval '1 hour',2),
        ('${trip.rows[0].id}','${trip.rows[0].campus_id}','return','${city}','${campus}',now()+interval '1 day',2)
    `);
    await db.query("select private.expire_open_trips()");
    const first = await db.query<{ status: string }>(
      `select status from public.trips where id='${trip.rows[0].id}'`,
    );
    expect(first.rows[0].status).toBe("open");
    const legs = await db.query<{ direction: string; status: string }>(
      `select direction,status from public.journey_legs where trip_id='${trip.rows[0].id}'`,
    );
    expect(legs.rows.find((leg) => leg.direction === "outward")?.status).toBe(
      "expired",
    );
    expect(legs.rows.find((leg) => leg.direction === "return")?.status).toBe(
      "open",
    );
    await db.exec(`update public.journey_legs set departure_at=now()-interval '1 minute'
      where trip_id='${trip.rows[0].id}' and direction='return'`);
    await db.query("select private.expire_open_trips()");
    const expired = await db.query<{ status: string }>(
      `select status from public.trips where id='${trip.rows[0].id}'`,
    );
    expect(expired.rows[0].status).toBe("expired");
    await asUser(
      alice,
      `select public.set_trip_status('${trip.rows[0].id}','completed')`,
    );
    const completed = await db.query<{ status: string }>(
      `select status from public.trips where id='${trip.rows[0].id}'`,
    );
    expect(completed.rows[0].status).toBe("completed");
    await expect(
      asUser(bob, "select private.expire_open_trips()"),
    ).rejects.toThrow();
  });

  it("keeps moderation removal consistent with item fulfilments", async () => {
    const item = await db.query<{ id: string }>(`
      insert into public.item_requests(campus_id,requester_id,preferred_zone_id,description,quantity,budget_limit,deadline_at,status)
      select p.campus_id,p.user_id,z.id,'Moderation test item',1,100,now()+interval '2 days','agreed'
      from public.profiles p join public.location_zones z on z.campus_id=p.campus_id
      where p.user_id='${bob}' and z.label='Vijay Nagar' returning id
    `);
    const leg = await db.query<{ id: string }>(`
      select l.id from public.journey_legs l join public.trips t on t.id=l.trip_id
      where t.organizer_id='${alice}' and l.status='open' limit 1
    `);
    await db.exec(`insert into public.item_fulfilments(request_id,traveller_id,leg_id,status)
      values('${item.rows[0].id}','${alice}','${leg.rows[0].id}','accepted')`);
    const report = await asUser<{ report_content: string }>(
      alice,
      `select public.report_content('item','${item.rows[0].id}','Inappropriate request content')`,
    );
    await asUser(
      alice,
      `select public.review_report('${report[0].report_content}','remove','Confirmed inappropriate content')`,
    );
    const state = await db.query<{
      request_status: string;
      offer_status: string;
    }>(`
      select r.status request_status,f.status offer_status from public.item_requests r
      join public.item_fulfilments f on f.request_id=r.id where r.id='${item.rows[0].id}'
    `);
    expect(state.rows[0]).toEqual({
      request_status: "cancelled",
      offer_status: "cancelled",
    });
    const purchased = await db.query<{ id: string }>(`
      insert into public.item_requests(campus_id,requester_id,preferred_zone_id,description,quantity,budget_limit,deadline_at,status)
      select p.campus_id,p.user_id,z.id,'Purchased moderation item',1,100,now()+interval '2 days','purchased'
      from public.profiles p join public.location_zones z on z.campus_id=p.campus_id
      where p.user_id='${bob}' and z.label='Vijay Nagar' returning id
    `);
    const purchasedReport = await asUser<{ report_content: string }>(
      alice,
      `select public.report_content('item','${purchased.rows[0].id}','Purchased content needs review')`,
    );
    await expect(
      asUser(
        alice,
        `select public.review_report('${purchasedReport[0].report_content}','remove','Remove after purchase')`,
      ),
    ).rejects.toThrow(/active purchase/);
  });

  it("caps repeated reports per member even through direct RPC calls", async () => {
    for (let index = 0; index < 9; index += 1) {
      await asUser(
        bob,
        `select public.report_content('profile','${alice}','Repeated contact report ${index}')`,
      );
    }
    await expect(
      asUser(
        bob,
        `select public.report_content('profile','${alice}','One report too many')`,
      ),
    ).rejects.toThrow(/Report limit reached/);
  });

  it("limits message bursts while preserving nonce retries", async () => {
    const conversation = await db.query<{ id: string }>(
      `select c.id from public.conversations c join public.join_requests r on r.id=c.context_id where c.context_kind='join' and r.requester_id='${bob}' limit 1`,
    );
    const id = conversation.rows[0].id;
    for (let index = 0; index < 29; index += 1) {
      const nonce = `00000000-0000-4000-8000-${(100 + index).toString().padStart(12, "0")}`;
      await asUser(
        bob,
        `select public.send_message('${id}','Rate test message','${nonce}')`,
      );
    }
    const retried = await asUser<{ send_message: number }>(
      bob,
      `select public.send_message('${id}','Going together','00000000-0000-4000-8000-000000000050')`,
    );
    expect(retried[0].send_message).toBeGreaterThan(0);
    await expect(
      asUser(
        bob,
        `select public.send_message('${id}','Over limit','00000000-0000-4000-8000-000000000300')`,
      ),
    ).rejects.toThrow(/Message limit reached/);
  });

  it("keeps push subscriptions with their verified owner", async () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/qa-device";
    await asUser(
      alice,
      `select public.save_push_subscription('${endpoint}',repeat('A',87),repeat('B',22))`,
    );
    expect(
      await asUser<{ endpoint: string }>(
        alice,
        "select endpoint from public.push_subscriptions",
      ),
    ).toEqual([{ endpoint }]);
    expect(
      await asUser<{ endpoint: string }>(
        bob,
        "select endpoint from public.push_subscriptions",
      ),
    ).toEqual([]);
    await asUser(bob, `select public.remove_push_subscription('${endpoint}')`);
    expect(
      await asUser<{ endpoint: string }>(
        alice,
        "select endpoint from public.push_subscriptions",
      ),
    ).toEqual([{ endpoint }]);
    await expect(
      asUser(
        outsider,
        `select public.save_push_subscription('${endpoint}',repeat('A',87),repeat('B',22))`,
      ),
    ).rejects.toThrow(/Subscription unavailable/);
    await asUser(
      alice,
      `select public.remove_push_subscription('${endpoint}')`,
    );
    expect(
      await asUser(alice, "select endpoint from public.push_subscriptions"),
    ).toEqual([]);
  });

  it("queues and claims push only for opted-in subscribers", async () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/qa-queue";
    await asUser(
      alice,
      `select public.save_push_subscription('${endpoint}',repeat('A',87),repeat('B',22))`,
    );
    await db.exec(`
      insert into public.notifications(recipient_id,kind,dedupe_key)
      values ('${alice}','test','push-queue-alice'),
             ('${bob}','test','push-queue-bob');
    `);
    await expect(
      asUser(alice, "select id from public.push_deliveries"),
    ).rejects.toThrow(/permission denied/);
    await db.exec("set role service_role");
    try {
      const claimed = await db.query<{ delivery_id: number; endpoint: string }>(
        "select delivery_id,endpoint from public.claim_push_deliveries(25)",
      );
      expect(claimed.rows).toHaveLength(1);
      expect(claimed.rows[0].endpoint).toBe(endpoint);
      await db.query(
        `select public.finish_push_delivery(${claimed.rows[0].delivery_id},'sent')`,
      );
    } finally {
      await db.exec("reset role");
    }
    await asUser(
      alice,
      `select public.remove_push_subscription('${endpoint}')`,
    );
  });

  it("counts a same-campus suggestion open without storing the visitor", async () => {
    const zones = await db.query<{ id: string }>(
      "select id from public.location_zones where label in ('IIT Indore Campus','Vijay Nagar') order by label",
    );
    const legs = JSON.stringify([
      {
        direction: "outward",
        origin_zone_id: zones.rows[0].id,
        destination_zone_id: zones.rows[1].id,
        departure_at: new Date(Date.now() + 86400000).toISOString(),
        seats_available: 1,
      },
    ]);
    const trip = await asUser<{ create_trip: string }>(
      alice,
      `select public.create_trip('${legs}'::jsonb,false,null)`,
    );
    const leg = await db.query<{ id: string }>(
      `select id from public.journey_legs where trip_id='${trip[0].create_trip}'`,
    );
    const before = await db.query<{ count: string }>(
      "select coalesce(sum(count),0) count from public.daily_product_metrics where event='match_opened'",
    );
    const opened = await asUser<{ record_match_open: string }>(
      bob,
      `select public.record_match_open('${leg.rows[0].id}')`,
    );
    expect(opened[0].record_match_open).toBe(trip[0].create_trip);
    const after = await db.query<{ count: string }>(
      "select coalesce(sum(count),0) count from public.daily_product_metrics where event='match_opened'",
    );
    expect(Number(after.rows[0].count) - Number(before.rows[0].count)).toBe(1);
    await expect(
      asUser(outsider, `select public.record_match_open('${leg.rows[0].id}')`),
    ).rejects.toThrow();
    await asUser(
      alice,
      `select public.set_trip_status('${trip[0].create_trip}','cancelled')`,
    );
    await expect(
      asUser(bob, `select public.record_match_open('${leg.rows[0].id}')`),
    ).rejects.toThrow();
  });

  it("respects the recipient's in-app notification preference", async () => {
    const recipient = "00000000-0000-4000-8000-000000000099";
    await db.exec(`
      insert into auth.users(id,email,email_confirmed_at)
      values('${recipient}','notice@iiti.ac.in',now());
      insert into public.profiles(user_id,campus_id,display_name)
      select '${recipient}',id,'Notice Member' from public.campuses where code='iiti';
    `);
    const zones = await db.query<{ id: string }>(
      "select id from public.location_zones where label in ('IIT Indore Campus','Vijay Nagar') order by label",
    );
    const legs = JSON.stringify([
      {
        direction: "outward",
        origin_zone_id: zones.rows[0].id,
        destination_zone_id: zones.rows[1].id,
        departure_at: new Date(Date.now() + 86400000).toISOString(),
        seats_available: 1,
      },
    ]);
    await asUser(
      recipient,
      `select public.update_own_profile('Notice Member','{"inApp":false,"push":false}'::jsonb)`,
    );
    try {
      const trip = await asUser<{ create_trip: string }>(
        recipient,
        `select public.create_trip('${legs}'::jsonb,false,null)`,
      );
      const leg = await db.query<{ id: string }>(
        `select id from public.journey_legs where trip_id='${trip[0].create_trip}'`,
      );
      const request = await asUser<{ request_join: string }>(
        bob,
        `select public.request_join('${leg.rows[0].id}')`,
      );
      const suppressed = await db.query<{ id: number }>(
        `select id from public.notifications where dedupe_key='join:${request[0].request_join}:created'`,
      );
      expect(suppressed.rows).toEqual([]);
      await asUser(
        recipient,
        `select public.update_own_profile('Notice Member','{"inApp":true,"push":false}'::jsonb)`,
      );
      const nextTrip = await asUser<{ create_trip: string }>(
        recipient,
        `select public.create_trip('${legs}'::jsonb,false,null)`,
      );
      const nextLeg = await db.query<{ id: string }>(
        `select id from public.journey_legs where trip_id='${nextTrip[0].create_trip}'`,
      );
      const nextRequest = await asUser<{ request_join: string }>(
        bob,
        `select public.request_join('${nextLeg.rows[0].id}')`,
      );
      const delivered = await db.query<{ id: number }>(
        `select id from public.notifications where dedupe_key='join:${nextRequest[0].request_join}:created'`,
      );
      expect(delivered.rows).toHaveLength(1);
    } finally {
      await db.exec(
        `update public.profiles set notification_preferences='{}' where user_id='${recipient}'`,
      );
    }
  });

  it("anonymizes a deleted account and ends its open activity", async () => {
    const dana = "00000000-0000-4000-8000-000000000098";
    await db.exec(`
      insert into auth.users(id,email,email_confirmed_at)
      values('${dana}','dana@iiti.ac.in',now());
      insert into public.profiles(user_id,campus_id,display_name)
      select '${dana}',id,'Dana' from public.campuses where code='iiti';
    `);
    const zones = await db.query<{ id: string }>(
      "select id from public.location_zones where label in ('IIT Indore Campus','Vijay Nagar') order by label",
    );
    const legs = JSON.stringify([
      {
        direction: "outward",
        origin_zone_id: zones.rows[0].id,
        destination_zone_id: zones.rows[1].id,
        departure_at: new Date(Date.now() + 86400000).toISOString(),
        seats_available: 2,
      },
    ]);
    const trip = await asUser<{ create_trip: string }>(
      dana,
      `select public.create_trip('${legs}'::jsonb,false,null)`,
    );
    const leg = await db.query<{ id: string }>(
      `select id from public.journey_legs where trip_id='${trip[0].create_trip}'`,
    );
    await asUser(bob, `select public.request_join('${leg.rows[0].id}')`);
    const item = await db.query<{ id: string }>(`
      insert into public.item_requests(campus_id,requester_id,preferred_zone_id,description,quantity,budget_limit,deadline_at,image_path)
      select p.campus_id,p.user_id,z.id,'Deletion test item',1,100,now()+interval '2 days','${dana}/x/photo.jpg'
      from public.profiles p join public.location_zones z on z.campus_id=p.campus_id
      where p.user_id='${dana}' and z.label='Vijay Nagar' returning id
    `);

    const images = await asUser<{ delete_own_account: string[] }>(
      dana,
      "select public.delete_own_account()",
    );
    expect(images[0].delete_own_account).toEqual([`${dana}/x/photo.jpg`]);
    const profile = await db.query<{ display_name: string; status: string }>(
      `select display_name,status from public.profiles where user_id='${dana}'`,
    );
    expect(profile.rows[0]).toEqual({
      display_name: "Deleted member",
      status: "deleted",
    });
    const state = await db.query<{
      trip: string;
      item: string;
      image: string | null;
    }>(`
      select (select status from public.trips where id='${trip[0].create_trip}') trip,
        (select status from public.item_requests where id='${item.rows[0].id}') item,
        (select image_path from public.item_requests where id='${item.rows[0].id}') image
    `);
    expect(state.rows[0]).toEqual({
      trip: "cancelled",
      item: "cancelled",
      image: null,
    });
    const notices = await db.query(
      `select id from public.notifications where recipient_id='${dana}'`,
    );
    expect(notices.rows).toEqual([]);
    await expect(
      asUser(dana, "select public.delete_own_account()"),
    ).rejects.toThrow();
  });

  it("purges finished content after 90 days and keeps active history", async () => {
    const old = "now()-interval '100 days'";
    const oldTrip = async (status: string) => {
      const trip = await db.query<{ id: string }>(`
        insert into public.trips(campus_id,organizer_id,status,updated_at)
        select campus_id,user_id,'${status}',${old} from public.profiles
        where user_id='${alice}' returning id
      `);
      const leg = await db.query<{ id: string }>(`
        insert into public.journey_legs(trip_id,campus_id,direction,origin_zone_id,destination_zone_id,departure_at,seats_available,status)
        select '${trip.rows[0].id}',p.campus_id,'outward',
          (select id from public.location_zones where label='IIT Indore Campus'),
          (select id from public.location_zones where label='Vijay Nagar'),
          ${old},2,'${status}'
        from public.profiles p where p.user_id='${alice}' returning id
      `);
      return { trip: trip.rows[0].id, leg: leg.rows[0].id };
    };
    const done = await oldTrip("completed");
    const supporting = await oldTrip("cancelled");
    const disputedTrip = await oldTrip("completed");
    const oldItem = async (status: string, updatedAt: string) =>
      (
        await db.query<{ id: string }>(`
          insert into public.item_requests(campus_id,requester_id,preferred_zone_id,description,quantity,budget_limit,deadline_at,status,updated_at,image_path)
          select p.campus_id,p.user_id,z.id,'Retention item ${status}',1,100,${old},'${status}',${updatedAt},'${bob}/${status}/photo.jpg'
          from public.profiles p join public.location_zones z on z.campus_id=p.campus_id
          where p.user_id='${bob}' and z.label='Vijay Nagar' returning id
        `)
      ).rows[0].id;
    const completedItem = await oldItem("completed", old);
    const disputedItem = await oldItem("disputed", old);
    const recentItem = await oldItem("cancelled", "now()");
    const join = await db.query<{ id: string }>(
      `insert into public.join_requests(leg_id,requester_id,status) values('${done.leg}','${bob}','accepted') returning id`,
    );
    const offer = await db.query<{ id: string }>(`
      insert into public.item_fulfilments(request_id,traveller_id,leg_id,status)
      values('${completedItem}','${alice}','${supporting.leg}','completed') returning id
    `);
    await db.exec(`
      insert into public.item_fulfilments(request_id,traveller_id,leg_id,status)
      values('${disputedItem}','${alice}','${disputedTrip.leg}','disputed');
      insert into public.conversations(campus_id,context_kind,context_id,member_a,member_b)
      select campus_id,'join','${join.rows[0].id}','${bob}','${alice}' from public.profiles where user_id='${alice}';
      insert into public.conversations(campus_id,context_kind,context_id,member_a,member_b)
      select campus_id,'item','${offer.rows[0].id}','${bob}','${alice}' from public.profiles where user_id='${alice}';
      insert into public.messages(conversation_id,sender_id,body,client_nonce)
      select id,'${bob}','Retention message',gen_random_uuid() from public.conversations
      where context_id in ('${join.rows[0].id}','${offer.rows[0].id}');
      insert into public.notifications(recipient_id,kind,dedupe_key,created_at)
      values ('${bob}','test','retention-old',${old}),('${bob}','test','retention-new',now());
    `);

    await expect(
      db.query("select public.purge_expired_content(now())"),
    ).rejects.toThrow();
    await expect(
      asUser(alice, "select public.purge_expired_content()"),
    ).rejects.toThrow();
    const purged = await db.query<{ purge_expired_content: string[] }>(
      "select public.purge_expired_content()",
    );
    expect(purged.rows[0].purge_expired_content).toEqual([
      `${bob}/completed/photo.jpg`,
    ]);
    const remaining = await db.query<{ trips: string[]; items: string[] }>(`
      select
        (select coalesce(array_agg(id::text),'{}') from public.trips
          where id in ('${done.trip}','${supporting.trip}','${disputedTrip.trip}')) trips,
        (select coalesce(array_agg(id::text),'{}') from public.item_requests
          where id in ('${completedItem}','${disputedItem}','${recentItem}')) items
    `);
    expect(remaining.rows[0].trips).toEqual([disputedTrip.trip]);
    expect([...remaining.rows[0].items].sort()).toEqual(
      [disputedItem, recentItem].sort(),
    );
    const leftovers = await db.query(`
      select id from public.conversations where context_id in ('${join.rows[0].id}','${offer.rows[0].id}')
      union all select id::text::uuid from public.join_requests where id='${join.rows[0].id}'
    `);
    expect(leftovers.rows).toEqual([]);
    const notices = await db.query<{ dedupe_key: string }>(
      "select dedupe_key from public.notifications where dedupe_key like 'retention-%'",
    );
    expect(notices.rows).toEqual([{ dedupe_key: "retention-new" }]);
  });
});

describe("asking a traveller to carry an item", () => {
  let next = 0;
  // Fresh members per case keep the daily write limits out of the way.
  async function member(name: string) {
    next += 1;
    const id = `00000000-0000-4000-8000-0000000a${String(next).padStart(4, "0")}`;
    await db.exec(`
      insert into auth.users(id,email,email_confirmed_at)
      values('${id}','${name.toLowerCase()}${next}@iiti.ac.in',now());
      insert into public.profiles(user_id,campus_id,display_name)
      select '${id}',id,'${name}' from public.campuses where code='iiti';
    `);
    return id;
  }
  async function trip(organizer: string, acceptsItems = true) {
    const zones = await db.query<{ id: string }>(
      "select id from public.location_zones where label in ('IIT Indore Campus','Vijay Nagar') order by label",
    );
    const legs = JSON.stringify([
      {
        direction: "outward",
        origin_zone_id: zones.rows[0].id,
        destination_zone_id: zones.rows[1].id,
        departure_at: new Date(Date.now() + 86400000).toISOString(),
        seats_available: 2,
      },
    ]);
    const created = await asUser<{ create_trip: string }>(
      organizer,
      `select public.create_trip('${legs}'::jsonb,${acceptsItems},null)`,
    );
    const leg = await db.query<{ id: string }>(
      `select id from public.journey_legs where trip_id='${created[0].create_trip}'`,
    );
    return { tripId: created[0].create_trip, legId: leg.rows[0].id };
  }
  async function ask(requester: string, legId: string) {
    const rows = await asUser<{ ask_to_carry: string }>(
      requester,
      `select public.ask_to_carry('${legId}','Two notebooks from any stationer',2,150)`,
    );
    const offer = await db.query<{ id: string }>(
      `select id from public.item_fulfilments where request_id='${rows[0].ask_to_carry}'`,
    );
    return { requestId: rows[0].ask_to_carry, offerId: offer.rows[0].id };
  }
  const state = async (requestId: string) =>
    (
      await db.query<{
        request: string;
        offer: string;
        price: string | null;
        description: string | null;
      }>(`
        select r.status request, f.status offer, f.agreed_price::text price, f.agreed_description description
        from public.item_requests r join public.item_fulfilments f on f.request_id=r.id
        where r.id='${requestId}'
      `)
    ).rows[0];
  const notified = async (recipient: string, kind: string) =>
    (
      await db.query(
        `select id from public.notifications where recipient_id='${recipient}' and kind='${kind}'`,
      )
    ).rows.length;

  it("asks a traveller, chats, accepts and completes the handover", async () => {
    const organizer = await member("Olu");
    const requester = await member("Ria");
    const { legId } = await trip(organizer);
    await expect(
      asUser(
        organizer,
        `select public.ask_to_carry('${legId}','Own trip ask item',1,10)`,
      ),
    ).rejects.toThrow();
    await expect(
      asUser(
        outsider,
        `select public.ask_to_carry('${legId}','Outsider ask item',1,10)`,
      ),
    ).rejects.toThrow();
    const { requestId, offerId } = await ask(requester, legId);
    const request = await db.query<{ zone: string; deadline: string }>(`
      select z.label zone, (r.deadline_at = l.departure_at)::text deadline
      from public.item_requests r join public.location_zones z on z.id=r.preferred_zone_id
      join public.journey_legs l on l.id='${legId}' where r.id='${requestId}'
    `);
    expect(request.rows[0]).toEqual({ zone: "Vijay Nagar", deadline: "true" });
    expect(await state(requestId)).toMatchObject({
      request: "open",
      offer: "asked",
    });
    expect(await notified(organizer, "item_asked")).toBe(1);
    await expect(
      asUser(
        requester,
        `select public.answer_carry_request('${offerId}',true)`,
      ),
    ).rejects.toThrow();
    await expect(
      asUser(organizer, `select public.offer_item('${requestId}','${legId}')`),
    ).rejects.toThrow();
    const conversation = await asUser<{ open_conversation: string }>(
      requester,
      `select public.open_conversation('item','${offerId}')`,
    );
    await asUser(
      requester,
      `select public.send_message('${conversation[0].open_conversation}','Is the blue one fine?',gen_random_uuid())`,
    );
    await asUser(
      organizer,
      `select public.answer_carry_request('${offerId}',true)`,
    );
    expect(await state(requestId)).toEqual({
      request: "agreed",
      offer: "accepted",
      price: "150.00",
      description: "Two notebooks from any stationer",
    });
    expect(await notified(requester, "item_ask_accepted")).toBe(1);
    await expect(
      asUser(
        organizer,
        `select public.answer_carry_request('${offerId}',false)`,
      ),
    ).rejects.toThrow();
    await asUser(
      organizer,
      `select public.set_item_status('${requestId}','purchased')`,
    );
    await asUser(
      organizer,
      `select public.set_item_status('${requestId}','ready')`,
    );
    await asUser(
      requester,
      `select public.set_item_status('${requestId}','completed')`,
    );
    expect(await state(requestId)).toMatchObject({
      request: "completed",
      offer: "completed",
    });
  });

  it("declines an ask, closes its chat and refuses trips without items", async () => {
    const organizer = await member("Dev");
    const requester = await member("Isha");
    const closed = await trip(organizer, false);
    await expect(
      asUser(
        requester,
        `select public.ask_to_carry('${closed.legId}','No items trip ask',1,10)`,
      ),
    ).rejects.toThrow();
    const { legId } = await trip(organizer);
    const { requestId, offerId } = await ask(requester, legId);
    const conversation = await asUser<{ open_conversation: string }>(
      requester,
      `select public.open_conversation('item','${offerId}')`,
    );
    await asUser(
      organizer,
      `select public.answer_carry_request('${offerId}',false)`,
    );
    expect(await state(requestId)).toMatchObject({
      request: "cancelled",
      offer: "declined",
    });
    expect(await notified(requester, "item_ask_declined")).toBe(1);
    await expect(
      asUser(
        requester,
        `select public.send_message('${conversation[0].open_conversation}','Still there?',gen_random_uuid())`,
      ),
    ).rejects.toThrow();
  });

  it("rejects asks across blocks and with suspended members", async () => {
    const organizer = await member("Kabir");
    const requester = await member("Meera");
    const { legId } = await trip(organizer);
    await db.exec(
      `insert into public.blocks(blocker_id,blocked_id) values('${organizer}','${requester}')`,
    );
    await expect(ask(requester, legId)).rejects.toThrow();
    await db.exec(`delete from public.blocks where blocker_id='${organizer}'`);
    await db.exec(
      `update public.profiles set status='suspended' where user_id='${organizer}'`,
    );
    await expect(ask(requester, legId)).rejects.toThrow();
    await db.exec(
      `update public.profiles set status='active' where user_id='${organizer}'`,
    );
    const { offerId } = await ask(requester, legId);
    await db.exec(
      `update public.profiles set status='suspended' where user_id='${requester}'`,
    );
    await expect(
      asUser(
        organizer,
        `select public.answer_carry_request('${offerId}',true)`,
      ),
    ).rejects.toThrow();
  });

  it("ends pending asks on cancel, trip end, expiry and account deletion", async () => {
    const organizer = await member("Nikhil");
    const requester = await member("Pooja");
    const first = await trip(organizer);
    const cancelled = await ask(requester, first.legId);
    await asUser(
      requester,
      `select public.set_item_status('${cancelled.requestId}','cancelled')`,
    );
    expect(await state(cancelled.requestId)).toMatchObject({
      request: "cancelled",
      offer: "cancelled",
    });
    const ended = await ask(requester, first.legId);
    await asUser(
      organizer,
      `select public.set_trip_status('${first.tripId}','cancelled')`,
    );
    expect(await state(ended.requestId)).toMatchObject({
      request: "cancelled",
      offer: "declined",
    });
    const second = await trip(organizer);
    const expiring = await ask(requester, second.legId);
    await db.exec(
      `update public.item_requests set deadline_at=now()-interval '1 minute' where id='${expiring.requestId}'`,
    );
    await db.query("select private.expire_open_items()");
    expect(await state(expiring.requestId)).toMatchObject({
      request: "expired",
      offer: "cancelled",
    });
    const pending = await ask(requester, second.legId);
    await asUser(organizer, "select public.delete_own_account()");
    expect(await state(pending.requestId)).toMatchObject({
      request: "cancelled",
      offer: "declined",
    });
  });

  it("counts asks against the daily item limit of the requester", async () => {
    const organizer = await member("Rohan");
    const requester = await member("Sana");
    const { legId } = await trip(organizer);
    await db.exec(`
      insert into public.item_requests(campus_id,requester_id,preferred_zone_id,description,quantity,budget_limit,deadline_at)
      select p.campus_id,p.user_id,z.id,'Seeded limit item',1,10,now()+interval '1 day'
      from public.profiles p join public.location_zones z on z.campus_id=p.campus_id,
        generate_series(1,20)
      where p.user_id='${requester}' and z.label='Vijay Nagar'
    `);
    await expect(ask(requester, legId)).rejects.toThrow(/Item limit/);
  });

  it("keeps the ask functions away from anonymous callers", async () => {
    await db.exec("set role anon");
    try {
      await expect(
        db.query(
          "select public.ask_to_carry(gen_random_uuid(),'Anonymous ask',1,1)",
        ),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query("select public.answer_carry_request(gen_random_uuid(),true)"),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role");
    }
  });
});
