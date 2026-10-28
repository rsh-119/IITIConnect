// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { askToCarry } from "@/app/community/items/actions";
import { createTrip, openMatchedTrip } from "./actions";

vi.mock("@/lib/auth", () => ({
  requireActiveMember: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

const legId = "00000000-0000-4000-8000-000000000088";
const tripId = "00000000-0000-4000-8000-000000000089";

function input() {
  const form = new FormData();
  form.set("legId", legId);
  form.set("tripId", "00000000-0000-4000-8000-000000000099");
  return form;
}

beforeEach(() => vi.clearAllMocks());

describe("matched-trip opening", () => {
  it("uses the trip resolved by the database, not a submitted trip ID", async () => {
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: tripId, error: null }),
    } as never);
    await expect(openMatchedTrip(input())).rejects.toThrow(
      `redirect:/community/trips/${tripId}`,
    );
  });

  it("keeps navigation available through an RLS read before the RPC is installed", async () => {
    const lookup = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          departure_at: new Date(Date.now() + 86_400_000).toISOString(),
          trips: { id: tripId, status: "open" },
        },
        error: null,
      }),
    };
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi
        .fn()
        .mockResolvedValue({ data: null, error: { code: "PGRST202" } }),
      from: vi.fn().mockReturnValue(lookup),
    } as never);
    await expect(openMatchedTrip(input())).rejects.toThrow(
      `redirect:/community/trips/${tripId}`,
    );
    expect(lookup.eq).toHaveBeenCalledWith("id", legId);
  });

  it("fails closed on other RPC errors", async () => {
    const from = vi.fn();
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "42501" } }),
      from,
    } as never);
    await expect(openMatchedTrip(input())).rejects.toThrow(
      "redirect:/community?status=invalid",
    );
    expect(from).not.toHaveBeenCalled();
  });
});

describe("simplified trip posting", () => {
  const campusId = "00000000-0000-4000-8000-0000000000c1";
  const cityId = "00000000-0000-4000-8000-0000000000c2";
  function tripForm(destination = cityId) {
    const form = new FormData();
    form.set("destination", destination);
    form.set("departure", "2099-01-01T09:30");
    form.set("seats", "3");
    form.set("acceptsItems", "on");
    form.set("note", "Hostel gate");
    return form;
  }
  function client(campus: { id: string } | null) {
    const lookup = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: campus, error: null }),
    };
    const rpc = vi.fn().mockResolvedValue({ data: tripId, error: null });
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(lookup),
      rpc,
    } as never);
    return { lookup, rpc };
  }

  it("starts every trip from the campus zone with one leg and no fare", async () => {
    const { lookup, rpc } = client({ id: campusId });
    await expect(createTrip(tripForm())).rejects.toThrow(
      `redirect:/community/trips/${tripId}`,
    );
    expect(lookup.eq).toHaveBeenCalledWith("label", "IIT Indore Campus");
    expect(rpc).toHaveBeenCalledWith("create_trip", {
      p_legs: [
        {
          direction: "outward",
          origin_zone_id: campusId,
          destination_zone_id: cityId,
          departure_at: "2099-01-01T04:00:00.000Z",
          seats_available: 3,
        },
      ],
      p_accepts_items: true,
      p_note: "Hostel gate",
    });
  });

  it("refuses a missing campus zone or a campus destination", async () => {
    client(null);
    await expect(createTrip(tripForm())).rejects.toThrow(
      "redirect:/community/trips/new?status=unavailable",
    );
    const { rpc } = client({ id: campusId });
    await expect(createTrip(tripForm(campusId))).rejects.toThrow(
      "redirect:/community/trips/new?status=invalid",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not send an ask with a too-short description", async () => {
    const rpc = vi.fn();
    vi.mocked(createClient).mockResolvedValue({ rpc } as never);
    const form = new FormData();
    form.set("tripId", tripId);
    form.set("legId", legId);
    form.set("description", "pen");
    form.set("quantity", "1");
    form.set("budget", "20");
    await expect(askToCarry(form)).rejects.toThrow(
      `redirect:/community/trips/${tripId}?status=ask-invalid`,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});
