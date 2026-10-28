export default function CommunityLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6" aria-busy="true">
      <p role="status" className="text-muted font-semibold">
        Loading trips…
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2" aria-hidden="true">
        {[0, 1, 2, 3].map((card) => (
          <div
            key={card}
            className="h-36 animate-pulse rounded-[24px] bg-white/70"
          />
        ))}
      </div>
    </main>
  );
}
