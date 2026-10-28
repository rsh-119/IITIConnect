import { CommunityNav } from "@/components/community-nav";
import Link from "next/link";
import { requireActiveMember } from "@/lib/auth";
import { PushControls } from "@/components/push-controls";
import { signOut } from "@/app/auth/actions";
import { deleteAccount, updateSettings } from "./actions";

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  saved: "Settings saved.",
  "confirm-delete": "Type DELETE to confirm account deletion.",
  "delete-unavailable":
    "Account deletion is not available right now. Please try again later.",
  "delete-failed": "Your account could not be deleted. Please try again.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { profile } = await requireActiveMember();
  const { status } = await searchParams;
  const preferences = (profile.notification_preferences ?? {}) as {
    inApp?: boolean;
    push?: boolean;
  };
  return (
    <main className="mx-auto max-w-2xl px-4 pt-4 pb-28 sm:px-6 md:pb-12">
      <CommunityNav />
      <h1 className="mt-10">
        <span className="serif">Profile</span> and settings
      </h1>
      <p className="mt-3 text-slate-600">
        Your institute email is kept private.
      </p>
      {profile.role === "moderator" && (
        <Link
          href="/community/moderation"
          className="text-accent mt-4 inline-block font-semibold underline"
        >
          Open moderation queue
        </Link>
      )}
      {status && (
        <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4">
          {statusMessages[status] ?? "Settings could not be saved."}
        </p>
      )}
      <form
        action={updateSettings}
        className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6"
      >
        <label className="block font-medium">
          Display name
          <input
            name="displayName"
            required
            minLength={2}
            maxLength={80}
            defaultValue={profile.display_name}
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3"
          />
        </label>
        <label className="flex items-center gap-3 font-medium">
          <input
            name="inApp"
            type="checkbox"
            defaultChecked={preferences.inApp !== false}
            className="size-5"
          />
          In-app notifications
        </label>
        <button className="bg-accent min-h-12 rounded-xl px-6 font-semibold text-white">
          Save settings
        </button>
      </form>
      <PushControls
        publicKey={
          process.env.VAPID_PRIVATE_KEY &&
          process.env.VAPID_SUBJECT &&
          process.env.SUPABASE_SECRET_KEY &&
          process.env.PUSH_DISPATCH_SECRET
            ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            : undefined
        }
      />
      <form action={signOut} className="mt-8 sm:hidden">
        <button className="min-h-12 w-full rounded-xl border px-5">
          Sign out
        </button>
      </form>
      <section
        aria-labelledby="delete-account"
        className="mt-8 rounded-3xl border border-red-200 bg-white p-6"
      >
        <h2 id="delete-account">Delete account</h2>
        <p className="mt-2 text-slate-600">
          Your open trips and requests are cancelled, your sign-in, email and
          notifications are removed, and your past messages and posts show as
          “Deleted member”. This cannot be undone. See the{" "}
          <Link href="/privacy" className="text-accent underline">
            privacy notice
          </Link>
          .
        </p>
        <form action={deleteAccount} className="mt-5 space-y-4">
          <label className="block font-medium">
            Type DELETE to confirm
            <input
              name="confirm"
              required
              pattern="DELETE"
              autoComplete="off"
              className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3"
            />
          </label>
          <button className="min-h-12 rounded-xl bg-red-700 px-6 font-semibold text-white">
            Delete my account
          </button>
        </form>
      </section>
    </main>
  );
}
