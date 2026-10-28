// Trips always start from this campus zone.
export const CAMPUS_ZONE_LABEL = "IIT Indore Campus";

export type JourneyCandidate = {
  id: string;
  campusId: string;
  originZoneId: string;
  destinationZoneId: string;
  departureAt: string;
  direction: "outward" | "return";
  status: "open" | "cancelled" | "completed";
  seatsAvailable: number;
  confirmedPassengers: number;
  acceptsItems: boolean;
};

export type RankedMatch = { legId: string; score: number; reason: string };

export function matchTrip(
  preference: {
    campusId: string;
    originZoneId: string;
    destinationZoneId: string;
    departureAt: string;
    flexibilityHours: number;
  },
  candidates: JourneyCandidate[],
  now = new Date(),
): RankedMatch[] {
  const target = Date.parse(preference.departureAt);
  return candidates
    .flatMap((leg) => {
      const deltaHours =
        Math.abs(Date.parse(leg.departureAt) - target) / 3_600_000;
      if (
        leg.campusId !== preference.campusId ||
        leg.status !== "open" ||
        leg.originZoneId !== preference.originZoneId ||
        leg.destinationZoneId !== preference.destinationZoneId ||
        leg.seatsAvailable <= leg.confirmedPassengers ||
        Date.parse(leg.departureAt) <= now.getTime() ||
        deltaHours > preference.flexibilityHours
      )
        return [];
      return [
        {
          legId: leg.id,
          score: Math.max(1, Math.round(100 - deltaHours * 8)),
          reason: `Same direction and zones; departure within ${Math.ceil(deltaHours)} hour(s) of your time.`,
        },
      ];
    })
    .sort((a, b) => b.score - a.score || a.legId.localeCompare(b.legId));
}
