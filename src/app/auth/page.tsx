import Link from "next/link";
import { GoogleButton, Wordmark } from "@/components/brand";
import { Scenery } from "@/components/scenery";

const statusMessages: Record<string, string> = {
  unavailable: "We could not process that request. Please try later.",
  "google-unavailable":
    "Google sign-in is unavailable. Please try again later.",
  "google-domain":
    "Choose your IIT Indore Google account ending in @iiti.ac.in.",
  "account-deleted":
    "Your account was deleted. Your sign-in and email were removed and your past posts now show as Deleted member.",
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return (
    <main className="relative flex min-h-screen flex-col overflow-x-clip px-5 py-6 sm:px-8">
      <Scenery className="absolute inset-x-0 bottom-0 h-[45%] w-full" />
      <div className="relative mx-auto w-full max-w-6xl">
        <Wordmark />
      </div>
      <div className="relative mx-auto my-auto w-full max-w-md py-12">
        <div className="rise rounded-[28px] bg-white/90 p-7 shadow-(--shadow-float) backdrop-blur sm:p-9">
          <h1 className="text-[2.1rem]">
            <span className="serif">Join your</span> campus community
          </h1>
          <p className="text-muted mt-3 leading-relaxed">
            Sign in with your IIT Indore Google account. There is no separate
            password or sign-up: your first sign-in creates your account.
          </p>
          {status && statusMessages[status] && (
            <p
              role="status"
              className="mt-5 rounded-2xl bg-[#fff4ec] p-4 text-sm font-semibold"
            >
              {statusMessages[status]}
            </p>
          )}
          {!configured ? (
            <p className="mt-6 rounded-2xl bg-[#fff4ec] p-4">
              Sign-in is unavailable until the project owner configures
              Supabase.
            </p>
          ) : (
            <>
              <GoogleButton className="mt-7 [&_button]:w-full" />
              <p className="text-muted mt-4 text-sm leading-relaxed">
                Use your account ending in @iiti.ac.in. Personal Google accounts
                are not accepted. By continuing you agree to the{" "}
                <Link href="/privacy" className="text-accent underline">
                  privacy notice
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </div>
      <p className="text-muted relative text-center text-sm">
        Independent student project · Not officially endorsed by IIT Indore
      </p>
    </main>
  );
}
