"use client";

import { useSyncExternalStore } from "react";
import { SeatDots } from "@/components/brand";

// Sample rows only: times are generated relative to the visitor's clock.
const SAMPLE = [
  { to: "Indore Airport", seats: 3, taken: 1, items: true },
  { to: "Vijay Nagar", seats: 4, taken: 2, items: true },
  { to: "Railway Station", seats: 3, taken: 3, items: false },
  { to: "Rajwada", seats: 2, taken: 0, items: true },
];
const STEP_MINUTES = 35;

function ist(date: Date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

// A minute-resolution clock; the server renders placeholders instead.
function subscribeClock(onChange: () => void) {
  const id = setInterval(onChange, 15_000);
  return () => clearInterval(id);
}
const minuteNow = () => Math.floor(Date.now() / 60_000) * 60_000;
const noClock = () => null;

export function LineupBoard() {
  const nowMs = useSyncExternalStore(subscribeClock, minuteNow, noClock);
  return (
    <figure className="w-full">
      <div className="rise border-line rounded-[28px] border bg-white/90 p-5 shadow-(--shadow-float) backdrop-blur sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-bold">Leaving campus soon</p>
          <time className="chip">
            {nowMs === null ? "--:--" : ist(new Date(nowMs))} IST
          </time>
        </div>
        <ol className="mt-4 space-y-2" aria-label="Sample trips leaving campus">
          {SAMPLE.map((row, index) => {
            const full = row.taken >= row.seats;
            const leaves =
              nowMs === null
                ? null
                : new Date(nowMs + (index + 1) * STEP_MINUTES * 60_000);
            return (
              <li
                key={row.to}
                className="rise flex items-center gap-4 rounded-2xl bg-[#fbf7f4] px-4 py-3"
                style={{ animationDelay: `${150 + index * 90}ms` }}
              >
                <time className="w-12 shrink-0 text-sm font-bold">
                  {leaves ? ist(leaves) : "--:--"}
                </time>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{row.to}</span>
                  <span className="text-muted mt-0.5 block text-xs">
                    {full ? "Full" : `${row.seats - row.taken} seats free`}
                    {row.items ? " · can bring items" : ""}
                  </span>
                </span>
                <SeatDots seats={row.seats} taken={row.taken} />
              </li>
            );
          })}
        </ol>
      </div>
      <figcaption className="text-muted mt-3 px-2 text-sm">
        Sample lineup for illustration. Real trips appear after you sign in.
      </figcaption>
    </figure>
  );
}
