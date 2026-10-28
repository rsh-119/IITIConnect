import Link from "next/link";
import { GoogleButton, Wordmark } from "@/components/brand";
import { LineupBoard } from "@/components/lineup-board";
import { Scenery } from "@/components/scenery";

const steps = [
  {
    title: "Post your trip",
    body: "Say where you are heading, when, and how many seats are free. Tick one box if you can bring things back.",
  },
  {
    title: "Ask them to bring it",
    body: "Need something from the city? Ask a student already going, with what you need and your budget.",
  },
  {
    title: "Sort it in private chat",
    body: "Every seat and every pick-up gets its own conversation with just the one person involved.",
  },
];

const promises = [
  "Only @iiti.ac.in Google accounts can join",
  "Campus zones and times, never your address or email",
  "One private chat per arrangement",
  "Finished trips and chats are deleted after 90 days",
];

export default function HomePage() {
  return (
    <main className="overflow-x-clip">
      <section className="relative">
        <Scenery className="absolute inset-x-0 bottom-0 h-[62%] w-full" />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <header className="flex items-center justify-between gap-4 py-5">
            <Wordmark />
            <nav className="flex items-center gap-1 sm:gap-2" aria-label="Site">
              <a
                href="#how"
                className="text-muted hidden rounded-full px-4 py-2 text-sm font-semibold no-underline hover:bg-white/70 sm:block"
              >
                How it works
              </a>
              <Link
                href="/auth"
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-bold no-underline shadow-sm hover:bg-white"
              >
                Sign in
              </Link>
            </nav>
          </header>
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 pt-10 pb-28 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16 lg:pb-40">
            <div>
              <h1 className="text-[clamp(2.6rem,6.2vw,4.25rem)] leading-[1.04]">
                <span className="serif block lg:text-[0.86em] lg:whitespace-nowrap">
                  Going to the city?
                </span>
                <span className="block">Go together.</span>
              </h1>
              <p className="text-muted mt-6 max-w-md text-lg leading-relaxed">
                Share the cab with an IIT Indore student already heading your
                way, or ask them to bring something back.
              </p>
              <GoogleButton className="mt-8" />
              <p className="text-muted mt-3 text-sm">
                Your first sign-in with @iiti.ac.in creates your profile.
              </p>
            </div>
            <LineupBoard />
          </div>
        </div>
      </section>

      <section
        id="how"
        aria-labelledby="how-title"
        className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28"
      >
        <h2 id="how-title" className="text-[clamp(1.9rem,4vw,2.75rem)]">
          <span className="serif">Three steps,</span> no group-chat scrolling
        </h2>
        <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          <span
            aria-hidden="true"
            className="absolute top-5 right-[16%] left-[16%] hidden border-t-2 border-dashed border-[#f2c7b5] md:block"
          />
          {steps.map((step, index) => (
            <li key={step.title} className="relative">
              <span className="relative grid size-10 place-items-center rounded-full bg-white text-sm font-extrabold text-[#cf4416] shadow-(--shadow-card)">
                {index + 1}
              </span>
              <h3 className="mt-5 text-xl">{step.title}</h3>
              <p className="text-muted mt-2 max-w-xs leading-relaxed">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <div className="grid gap-10 rounded-[32px] bg-white/85 p-8 shadow-(--shadow-float) backdrop-blur sm:p-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h2 className="text-[clamp(1.8rem,3.6vw,2.5rem)]">
              <span className="serif">Only your</span> campus.
            </h2>
            <p className="text-muted mt-4 max-w-sm leading-relaxed">
              Everyone here signs in with an IIT Indore Google account, so you
              always know who you are travelling with.
            </p>
            <GoogleButton className="mt-8" />
          </div>
          <ul className="grid gap-3">
            {promises.map((promise) => (
              <li
                key={promise}
                className="flex items-center gap-3 rounded-2xl bg-[#fbf7f4] px-5 py-4 font-semibold"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5 shrink-0 text-[#15803d]"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
                {promise}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="text-muted mx-auto flex max-w-6xl flex-wrap justify-between gap-3 border-t border-[#ece4dd] px-5 py-8 text-sm sm:px-8">
        <span>© {new Date().getFullYear()} IITIConnect</span>
        <span>
          Independent student project · Not officially endorsed by IIT Indore ·{" "}
          <Link href="/privacy" className="underline">
            Privacy
          </Link>
        </span>
      </footer>
    </main>
  );
}
