import { describe, expect, it } from "vitest";
import {
  formatIst,
  formatIstShort,
  istDayRange,
  istInputValue,
  istLocalToUtc,
} from "./time";

describe("India time display", () => {
  it("converts a local departure to UTC", () => {
    expect(istLocalToUtc("2026-10-20T09:30")).toBe("2026-10-20T04:00:00.000Z");
  });
  it("formats a UTC timestamp in India time", () => {
    expect(formatIst("2026-10-20T04:00:00.000Z")).toContain("9:30");
    expect(istInputValue("2026-10-20T04:00:00.000Z")).toBe("2026-10-20T09:30");
    expect(formatIstShort("2026-10-20T18:45:00.000Z")).toBe("21 Oct · 00:15");
  });
  it("includes the final fractional second of an IST feed day", () => {
    const range = istDayRange("2026-10-20");
    expect(range).toEqual({
      start: "2026-10-19T18:30:00.000Z",
      end: "2026-10-20T18:30:00.000Z",
    });
    expect(Date.parse("2026-10-20T18:29:59.999Z")).toBeLessThan(
      Date.parse(range!.end),
    );
    expect(istDayRange("2026-02-31")).toBeNull();
  });
});
