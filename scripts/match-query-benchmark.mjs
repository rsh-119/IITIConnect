import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const memberId = "00000000-0000-4000-8000-000000000001";
try {
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
  for (const name of [
    "20261018150000_foundation.sql",
    "20261018171000_seed_zones.sql",
  ])
    await db.exec(
      await readFile(resolve("supabase", "migrations", name), "utf8"),
    );
  const campus = await db.query("select id from public.campuses limit 1");
  const campusId = campus.rows[0].id;
  const zones = await db.query(
    "select id from public.location_zones order by label limit 2",
  );
  if (zones.rows.length < 2) throw new Error("Two zones are required");
  const [originId, destinationId] = zones.rows.map((zone) => zone.id);
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at) values ($1,'benchmark@iiti.ac.in',now())",
    [memberId],
  );
  await db.query(
    "insert into public.profiles(user_id,campus_id,display_name) values ($1,$2,'Benchmark member')",
    [memberId, campusId],
  );
  await db.query(
    `create temporary table benchmark_trips as
     select gen_random_uuid() id, n from generate_series(1,5000) n`,
  );
  await db.query(
    `insert into public.trips(id,campus_id,organizer_id,accepts_items)
     select id,$1,$2,true from benchmark_trips`,
    [campusId, memberId],
  );
  await db.query(
    `insert into public.journey_legs
       (trip_id,campus_id,direction,origin_zone_id,destination_zone_id,departure_at,seats_available)
     select id,$1,'outward',
       case when n % 8 = 0 then $3::uuid else $2::uuid end,
       case when n % 8 = 0 then $2::uuid else $3::uuid end,
       now() + interval '1 day' + n * interval '1 minute',2
     from benchmark_trips`,
    [campusId, originId, destinationId],
  );
  await db.exec("analyze public.trips; analyze public.journey_legs;");
  await db.exec(
    `set role authenticated; set request.jwt.claim.sub = '${memberId}';`,
  );
  const plan = await db.query(
    `explain (analyze, format json)
     select l.id from public.journey_legs l
     join public.trips t on t.id = l.trip_id
     where l.status = 'open' and t.status = 'open'
       and t.accepts_items = true
       and l.campus_id = $1
       and l.direction = 'outward'
       and l.destination_zone_id = $2
       and l.departure_at >= now()
       and l.departure_at <= now() + interval '4 days'
     order by l.departure_at limit 50`,
    [campusId, destinationId],
  );
  const root = plan.rows[0]["QUERY PLAN"][0];
  const nodes = [];
  const visit = (node) => {
    nodes.push(node["Node Type"]);
    for (const child of node.Plans ?? []) visit(child);
  };
  visit(root.Plan);
  console.log(
    JSON.stringify({
      rows: 5000,
      returned: root.Plan["Actual Rows"],
      executionMs: root["Execution Time"],
      planNodes: nodes,
    }),
  );
} finally {
  await db.close();
}
