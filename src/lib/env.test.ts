import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

describe("parseServerEnv", () => {
  it("accepts and normalizes configured campus domains", () => {
    expect(
      parseServerEnv({
        ALLOWED_EMAIL_DOMAINS: " IITI.AC.IN,example.edu,iiti.ac.in ",
      }).ALLOWED_EMAIL_DOMAINS,
    ).toEqual(["iiti.ac.in", "example.edu"]);
  });

  it("rejects malformed domains and incomplete Supabase configuration", () => {
    expect(() =>
      parseServerEnv({ ALLOWED_EMAIL_DOMAINS: "@iiti.ac.in" }),
    ).toThrow();
    expect(() =>
      parseServerEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrow();
  });
});
