import { redirect } from "next/navigation";
import { CommunityNav } from "@/components/community-nav";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatIst } from "@/lib/time";
import { reviewReport, setZoneStatus } from "./actions";

export const dynamic = "force-dynamic";

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { profile } = await requireActiveMember();
  if (profile.role !== "moderator") redirect("/community");
  const { status } = await searchParams;
  const supabase = await createClient();
  // This server-only query intentionally uses the current UTC day on each request.
  // eslint-disable-next-line react-hooks/purity
  const activityStart = new Date(Date.now() - 6 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const [reportResult, metricResult, auditResult, zoneResult, zoneAuditResult] =
    await Promise.all([
      supabase
        .from("reports")
        .select("id,target_kind,target_id,reason,created_at")
        .eq("status", "open")
        .order("created_at")
        .limit(50),
      supabase
        .from("daily_product_metrics")
        .select("day,event,count")
        .gte("day", activityStart)
        .order("day", { ascending: false })
        .limit(50),
      supabase
        .from("moderation_actions")
        .select("id,target_kind,action,reason,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("location_zones")
        .select("id,label,active")
        .order("label")
        .limit(100),
      supabase
        .from("campus_management_actions")
        .select("id,zone_id,active,reason,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
  const { data: reports, error } = reportResult;
  return (
    <main className="mx-auto max-w-3xl px-4 pt-4 pb-28 sm:px-6 md:pb-12">
      <CommunityNav />
      <h1 className="mt-10">Moderation queue</h1>
      <section
        className="mt-8 rounded-2xl border border-slate-200 bg-white p-5"
        aria-labelledby="activity-heading"
      >
        <h2 id="activity-heading">Campus activity, last seven days</h2>
        {metricResult.error ? (
          <p className="mt-3">Activity counts are unavailable.</p>
        ) : !metricResult.data?.length ? (
          <p className="mt-3">No activity recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {metricResult.data.map((metric) => (
              <li
                key={`${metric.day}-${metric.event}`}
                className="flex justify-between gap-3 text-sm"
              >
                <span>
                  {metric.day} · {metric.event.replaceAll("_", " ")}
                </span>
                <strong>{metric.count}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
      {status && (
        <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4">
          {status === "reviewed"
            ? "Decision recorded."
            : status === "zone-updated"
              ? "Zone change recorded."
              : status === "zone-failed"
                ? "Zone change unavailable. Check for active trips or item requests."
                : "The decision could not be saved."}
        </p>
      )}
      {error ? (
        <p className="mt-8">Reports are unavailable.</p>
      ) : !reports?.length ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-6">
          No open reports.
        </p>
      ) : (
        <ul className="mt-8 space-y-5">
          {reports.map((report) => (
            <li
              key={report.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <p className="font-semibold">
                {report.target_kind} · {formatIst(report.created_at)}
              </p>
              <p className="mt-2 text-xs break-all text-slate-600">
                Target: {report.target_id}
              </p>
              <p className="mt-3 whitespace-pre-wrap">{report.reason}</p>
              <form action={reviewReport} className="mt-5 space-y-3">
                <input type="hidden" name="reportId" value={report.id} />
                <label className="block font-medium">
                  Decision
                  <select
                    name="decision"
                    className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3"
                  >
                    <option value="dismiss">Dismiss</option>
                    {report.target_kind === "profile" && (
                      <option value="suspend">Suspend member</option>
                    )}
                    {["trip", "item"].includes(report.target_kind) && (
                      <option value="remove">Remove post</option>
                    )}
                  </select>
                </label>
                <label className="block font-medium">
                  Reason for the audit record
                  <textarea
                    name="reason"
                    required
                    minLength={10}
                    maxLength={1000}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-slate-300 p-3"
                  />
                </label>
                <button className="bg-accent min-h-11 rounded-lg px-5 font-semibold text-white">
                  Save decision
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <section className="mt-10" aria-labelledby="audit-heading">
        <h2 id="audit-heading">Recent decisions</h2>
        {auditResult.error ? (
          <p className="mt-3">Audit history is unavailable.</p>
        ) : !auditResult.data?.length ? (
          <p className="mt-3">No decisions recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {auditResult.data.map((action) => (
              <li
                key={action.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="font-medium">
                  {action.action} · {action.target_kind} ·{" "}
                  {formatIst(action.created_at)}
                </p>
                <p className="mt-2 text-sm whitespace-pre-wrap">
                  {action.reason}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-10" aria-labelledby="zones-heading">
        <h2 id="zones-heading">Campus zones</h2>
        <p className="mt-2 text-sm text-slate-600">
          A zone with active trips or item requests cannot be disabled.
        </p>
        {zoneResult.error ? (
          <p className="mt-3">Zones are unavailable.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {(zoneResult.data ?? []).map((zone) => (
              <li
                key={zone.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="font-medium">
                  {zone.label} · {zone.active ? "Active" : "Inactive"}
                </p>
                <form action={setZoneStatus} className="mt-3 space-y-3">
                  <input type="hidden" name="zoneId" value={zone.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={String(!zone.active)}
                  />
                  <label className="block text-sm font-medium">
                    Reason for zone change
                    <input
                      name="reason"
                      required
                      minLength={10}
                      maxLength={1000}
                      className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3"
                    />
                  </label>
                  <button className="min-h-11 rounded-lg border border-slate-300 px-4 font-medium">
                    {zone.active ? "Disable zone" : "Enable zone"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <h3 className="mt-6 font-semibold">Recent zone changes</h3>
        {zoneAuditResult.error ? (
          <p className="mt-2">Zone history is unavailable.</p>
        ) : !zoneAuditResult.data?.length ? (
          <p className="mt-2">No zone changes recorded.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {zoneAuditResult.data.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-slate-200 p-3"
              >
                {formatIst(entry.created_at)} ·{" "}
                {entry.active ? "Enabled" : "Disabled"} ·{" "}
                {zoneResult.data?.find((zone) => zone.id === entry.zone_id)
                  ?.label ?? "Zone"}
                <p className="mt-1 whitespace-pre-wrap">{entry.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
