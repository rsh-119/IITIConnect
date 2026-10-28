import { z } from "zod";
import { CommunityNav } from "@/components/community-nav";
import { requireActiveMember } from "@/lib/auth";
import { submitReport } from "./actions";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; id?: string; status?: string }>;
}) {
  await requireActiveMember();
  const { kind, id, status } = await searchParams;
  const validKind = z
    .enum(["profile", "trip", "item", "message"])
    .safeParse(kind);
  const validId =
    validKind.success &&
    (validKind.data === "message"
      ? /^\d+$/.test(id ?? "")
      : z.uuid().safeParse(id).success);
  return (
    <main className="mx-auto max-w-2xl px-4 pt-4 pb-28 sm:px-6 md:pb-12">
      <CommunityNav />
      <h1 className="mt-10">Report a concern</h1>
      <p className="mt-3 text-slate-600">
        A campus moderator will review your report. Describe what happened
        without adding sensitive details.
      </p>
      {status && (
        <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4">
          {status === "sent"
            ? "Report submitted."
            : "The report could not be submitted."}
        </p>
      )}
      {!validId ? (
        <p className="mt-8">
          Open this form from the content you want to report.
        </p>
      ) : (
        <form
          action={submitReport}
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-6"
        >
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <p className="font-medium">Reporting {kind}</p>
          <label htmlFor="reason" className="mt-5 block font-medium">
            What happened?
          </label>
          <textarea
            id="reason"
            name="reason"
            required
            minLength={10}
            maxLength={1000}
            rows={5}
            className="mt-2 w-full rounded-lg border border-slate-300 p-3"
          />
          <button className="bg-accent mt-5 min-h-12 rounded-xl px-6 font-semibold text-white">
            Submit report
          </button>
        </form>
      )}
    </main>
  );
}
