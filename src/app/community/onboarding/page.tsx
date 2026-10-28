import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { completeProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) redirect("/auth");
  if (member.profile?.status === "active") redirect("/community");
  const { status } = await searchParams;
  return (
    <main className="mx-auto max-w-lg px-5 py-16">
      <h1>Complete your profile</h1>
      {member.profile?.status === "suspended" ? (
        <p className="mt-5 rounded-xl bg-amber-50 p-5">
          This account is suspended. Community access is unavailable.
        </p>
      ) : (
        <>
          <p className="mt-4 text-slate-600">
            Choose a display name. Your email will not appear in the community
            feed.
          </p>
          {status && (
            <p role="alert" className="mt-5 text-red-700">
              {status === "name"
                ? "Enter a name between 2 and 80 characters."
                : "Profile creation is unavailable. Please try again later."}
            </p>
          )}
          <form action={completeProfile} className="mt-8">
            <label htmlFor="displayName" className="block font-medium">
              Display name
            </label>
            <input
              id="displayName"
              name="displayName"
              required
              minLength={2}
              maxLength={80}
              defaultValue={
                typeof member.user.user_metadata?.full_name === "string"
                  ? member.user.user_metadata.full_name.slice(0, 80)
                  : undefined
              }
              className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3"
            />
            <button className="bg-accent mt-6 min-h-12 rounded-xl px-6 font-semibold text-white">
              Continue
            </button>
          </form>
        </>
      )}
    </main>
  );
}
