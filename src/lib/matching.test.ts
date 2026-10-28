import { describe, expect, it } from "vitest";
import { matchTrip, type JourneyCandidate } from "./matching";

const now = new Date("2026-10-18T00:00:00Z");
const candidate: JourneyCandidate = {
  id: "a",
  campusId: "iiti",
  originZoneId: "campus",
  destinationZoneId: "city",
  departureAt: "2026-10-19T06:00:00Z",
  direction: "outward",
  status: "open",
  seatsAvailable: 2,
  confirmedPassengers: 1,
  acceptsItems: true,
};

describe("rule-based matching", () => {
  it("ranks compatible trips and excludes full or cross-campus trips", () => {
    const matches = matchTrip(
      {
        campusId: "iiti",
        originZoneId: "campus",
        destinationZoneId: "city",
        departureAt: "2026-10-19T07:00:00Z",
        flexibilityHours: 2,
      },
      [
        candidate,
        { ...candidate, id: "full", confirmedPassengers: 2 },
        { ...candidate, id: "other", campusId: "other" },
      ],
      now,
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].reason).toContain("Same direction");
  });
});
