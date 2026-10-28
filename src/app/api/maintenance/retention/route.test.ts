// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, remove } = vi.hoisted(() => ({ rpc: vi.fn(), remove: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc, storage: { from: () => ({ remove }) } }),
}));

import { POST } from "./route";

function request(secret = "scheduler-secret") {
  return new NextRequest("http://localhost:3000/api/maintenance/retention", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe("retention purge", () => {
  beforeEach(() => {
    vi.stubEnv("PUSH_DISPATCH_SECRET", "scheduler-secret");
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-service-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    rpc.mockReset();
    remove.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects an invalid bearer token before purging", async () => {
    const response = await POST(request("wrong"));
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("purges rows and removes the returned images", async () => {
    rpc.mockResolvedValue({
      data: ["a/b/one.jpg", "a/c/two.png"],
      error: null,
    });
    remove.mockResolvedValue({ error: null });
    const response = await POST(request());
    expect(rpc).toHaveBeenCalledWith("purge_expired_content");
    expect(remove).toHaveBeenCalledWith(["a/b/one.jpg", "a/c/two.png"]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ images: 2, imageFailures: 0 });
  });
});
