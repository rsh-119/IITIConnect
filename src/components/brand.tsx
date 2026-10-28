import Link from "next/link";
import { signInWithGoogle } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="IITIConnect home"
      className="flex items-center gap-2 text-lg font-extrabold tracking-tight no-underline"
    >
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="15" fill="#fde9e1" />
        <path
          d="M9 21c3.5-9 10.5-9 14-1"
          fill="none"
          stroke="#cf4416"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="9" cy="21" r="2.6" fill="#1c2333" />
        <circle cx="23" cy="20" r="2.6" fill="#f0643c" />
      </svg>
      IITIConnect
    </Link>
  );
}

// Seats as a row of dots: filled ones are still open.
export function SeatDots({
  seats,
  taken = 0,
}: {
  seats: number;
  taken?: number;
}) {
  const full = taken >= seats;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1"
      aria-label={full ? "Full" : `${seats - taken} of ${seats} seats left`}
    >
      {Array.from({ length: seats }, (_, seat) => (
        <span
          key={seat}
          className={`size-2.5 rounded-full ${seat >= taken ? "bg-coral-glow" : "bg-slate-300"}`}
        />
      ))}
    </span>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

// One tap into the campus with the college Google account.
export function GoogleButton({ className = "" }: { className?: string }) {
  return (
    <form action={signInWithGoogle} className={className}>
      <SubmitButton
        pendingLabel="Opening Google…"
        className="bg-accent flex min-h-13 w-full items-center justify-center gap-3 px-6 text-base font-bold whitespace-nowrap disabled:opacity-60 sm:w-auto"
      >
        <span className="grid size-7 place-items-center rounded-full bg-white">
          <GoogleMark />
        </span>
        Continue with IIT Indore Google
      </SubmitButton>
    </form>
  );
}
