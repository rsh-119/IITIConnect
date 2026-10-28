import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { openMatchedTrip } from "@/app/community/trips/actions";
import { istInputValue } from "@/lib/time";
import { TripSuggestions } from "./trip-suggestions";

vi.mock("@/app/community/trips/actions", () => ({
  openMatchedTrip: vi.fn().mockResolvedValue(undefined),
}));

describe("trip suggestion navigation", () => {
  it("opens the selected database leg without submitting the trip form", async () => {
    const departure = new Date(Date.now() + 86_400_000).toISOString();
    render(
      <form onSubmit={(event) => event.preventDefault()}>
        <select name="origin" aria-label="From" defaultValue="campus">
          <option value="campus">Campus</option>
        </select>
        <select name="destination" aria-label="To" defaultValue="city">
          <option value="city">City</option>
        </select>
        <input
          name="departure"
          aria-label="Departure"
          defaultValue={istInputValue(departure)}
        />
        <TripSuggestions
          campusId="iiti"
          journeys={[
            {
              id: "00000000-0000-4000-8000-000000000088",
              tripId: "00000000-0000-4000-8000-000000000089",
              campusId: "iiti",
              originZoneId: "campus",
              destinationZoneId: "city",
              departureAt: departure,
              direction: "outward",
              status: "open",
              seatsAvailable: 2,
              confirmedPassengers: 0,
              acceptsItems: false,
            },
          ]}
        />
      </form>,
    );
    fireEvent.change(screen.getByLabelText("Departure"));
    fireEvent.click(
      await screen.findByRole("button", { name: /View trip at/ }),
    );
    await waitFor(() => expect(openMatchedTrip).toHaveBeenCalledOnce());
    const submitted = vi.mocked(openMatchedTrip).mock.calls[0][0];
    expect(submitted.get("legId")).toBe("00000000-0000-4000-8000-000000000088");
  });
});
