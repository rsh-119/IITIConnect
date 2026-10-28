// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
const signOut = vi.fn();

vi.mock("@/lib/env", () => ({ hasSupabaseConfig: () => true }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession, signOut } }),
}));

import { GET } from "./route";

function verifiedUser(email: string, hd: string) {
  return {
    email,
    email_confirmed_at: "2026-10-20T00:00:00Z",
    identities: [
      {
        provider: "google",
        identity_data: { email, email_verified: true, hd },
      },
    ],
  };
}

describe("Google OAuth callback", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    signOut.mockReset();
    signOut.mockResolvedValue({ error: null });
  });

  it("admits a verified IIT Indore Workspace account", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: verifiedUser("student@iiti.ac.in", "iiti.ac.in") },
      error: null,
    });
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/google/callback?code=one-time-code&sb_flow_id=flow12345678",
      ),
    );
    expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time-code", {
      flowId: "flow12345678",
    });
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/community",
    );
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signs out an outside account before redirecting", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: verifiedUser("student@iiti.ac.in", "other.ac.in") },
      error: null,
    });
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/google/callback?code=one-time-code",
      ),
    );
    expect(signOut).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth?status=google-domain",
    );
  });

  it("rejects a callback without an authorization code", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/auth/google/callback"),
    );
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth?status=google-unavailable",
    );
  });
});
