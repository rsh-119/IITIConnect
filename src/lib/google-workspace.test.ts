import { describe, expect, it } from "vitest";
import { isAllowedGoogleWorkspaceUser } from "./google-workspace";

function googleUser(
  overrides: {
    email?: string;
    hd?: string;
    customHd?: string;
    verified?: boolean;
    provider?: string;
  } = {},
) {
  const email = overrides.email ?? "student@iiti.ac.in";
  return {
    email,
    email_confirmed_at: "2026-10-20T00:00:00Z",
    identities: [
      {
        provider: overrides.provider ?? "google",
        identity_data: overrides.customHd
          ? {
              email,
              email_verified: overrides.verified ?? true,
              custom_claims: { hd: overrides.customHd },
            }
          : {
              email,
              email_verified: overrides.verified ?? true,
              hd: overrides.hd ?? "iiti.ac.in",
            },
      },
    ],
  };
}

describe("IIT Indore Google Workspace identity", () => {
  it("accepts a verified institute Google identity", () => {
    expect(isAllowedGoogleWorkspaceUser(googleUser())).toBe(true);
  });

  it("reads the hosted-domain claim where Supabase stores it", () => {
    expect(
      isAllowedGoogleWorkspaceUser(googleUser({ customHd: "iiti.ac.in" })),
    ).toBe(true);
    expect(
      isAllowedGoogleWorkspaceUser(googleUser({ customHd: "other.ac.in" })),
    ).toBe(false);
  });

  it("rejects a personal Google account and a missing hosted-domain claim", () => {
    expect(
      isAllowedGoogleWorkspaceUser(googleUser({ email: "student@gmail.com" })),
    ).toBe(false);
    expect(isAllowedGoogleWorkspaceUser(googleUser({ hd: "" }))).toBe(false);
    expect(
      isAllowedGoogleWorkspaceUser(googleUser({ hd: "other.ac.in" })),
    ).toBe(false);
  });

  it("rejects unverified and non-Google identities", () => {
    expect(isAllowedGoogleWorkspaceUser(googleUser({ verified: false }))).toBe(
      false,
    );
    expect(
      isAllowedGoogleWorkspaceUser(googleUser({ provider: "email" })),
    ).toBe(false);
  });
});
