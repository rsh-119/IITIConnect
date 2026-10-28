"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-start justify-center px-6 py-16">
      <h1 className="mt-3">We could not load this page.</h1>
      <p className="mt-4 text-slate-600">
        Please try again. If the problem continues, return later.
      </p>
      <button
        className="bg-accent mt-8 min-h-12 rounded-xl px-6 py-3 font-semibold text-white"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </main>
  );
}
