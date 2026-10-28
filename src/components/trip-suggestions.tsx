"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { matchTrip, type JourneyCandidate } from "@/lib/matching";
import { formatIst, istLocalToUtc } from "@/lib/time";
import { openMatchedTrip } from "@/app/community/trips/actions";

type SuggestedJourney = JourneyCandidate & { tripId: string };

export function TripSuggestions({
  campusId,
  journeys,
}: {
  campusId: string;
  journeys: SuggestedJourney[];
}) {
  const marker = useRef<HTMLDivElement>(null);
  const [opening, startOpening] = useTransition();
  const [selection, setSelection] = useState<{
    origin: string;
    destination: string;
    departure: string;
  } | null>(null);
  useEffect(() => {
    const form = marker.current?.closest("form");
    if (!form) return;
    const update = () => {
      const fields = new FormData(form);
      setSelection({
        origin: String(fields.get("origin") ?? ""),
        destination: String(fields.get("destination") ?? ""),
        departure: String(fields.get("departure") ?? ""),
      });
    };
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    return () => {
      form.removeEventListener("input", update);
      form.removeEventListener("change", update);
    };
  }, []);
  let matches: ReturnType<typeof matchTrip> = [];
  if (selection?.origin && selection.destination && selection.departure) {
    try {
      matches = matchTrip(
        {
          campusId,
          originZoneId: selection.origin,
          destinationZoneId: selection.destination,
          departureAt: istLocalToUtc(selection.departure),
          flexibilityHours: 3,
        },
        journeys,
      ).slice(0, 3);
    } catch {
      /* Partial date input is not a usable departure. */
    }
  }
  const byLeg = new Map(journeys.map((journey) => [journey.id, journey]));
  return (
    <div
      ref={marker}
      className="border-t border-[#f1ebe6] pt-4 sm:col-span-2"
      aria-live="polite"
    >
      <h2 className="text-base">Check existing trips</h2>
      <p className="mt-1 text-sm text-slate-600">
        Pick a destination and time to see trips already leaving within three
        hours.
      </p>
      {matches.length > 0 && (
        <ul className="mt-3 space-y-2">
          {matches.map((match) => {
            const journey = byLeg.get(match.legId);
            if (!journey) return null;
            return (
              <li key={match.legId} className="text-sm">
                <button
                  type="button"
                  disabled={opening}
                  onClick={() =>
                    startOpening(async () => {
                      const formData = new FormData();
                      formData.set("legId", match.legId);
                      await openMatchedTrip(formData);
                    })
                  }
                  className="text-accent min-h-11 font-semibold underline disabled:opacity-60"
                >
                  {opening
                    ? "Opening trip…"
                    : `View trip at ${formatIst(journey.departureAt)}`}
                </button>
                <p className="mt-1 text-slate-600">{match.reason}</p>
              </li>
            );
          })}
        </ul>
      )}
      {selection?.origin &&
        selection.destination &&
        selection.departure &&
        matches.length === 0 && (
          <p className="mt-3 text-sm text-slate-600">
            No compatible trips in the current preview.
          </p>
        )}
    </div>
  );
}
