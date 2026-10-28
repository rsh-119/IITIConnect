// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, sendNotification } = vi.hoisted(() => ({
  rpc: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc }),
}));
vi.mock("web-push", () => ({
  default: { sendNotification },
}));

import { POST } from "./route";

function request(secret = "dispatch-secret") {
  return new NextRequest("http://localhost:3000/api/push/dispatch", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe("push dispatch", () => {
  beforeEach(() => {
    vi.stubEnv("PUSH_DISPATCH_SECRET", "dispatch-secret");
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-service-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
    vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
    vi.stubEnv("VAPID_SUBJECT", "https://example.org");
    rpc.mockReset();
    sendNotification.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects an invalid bearer token before claiming work", async () => {
    const response = await POST(request("wrong"));
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends a generic payload and records the outcome", async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          delivery_id: 3,
          notification_id: 4,
          endpoint: "https://fcm.googleapis.com/fcm/send/test",
          p256dh: "key",
          auth_secret: "auth",
        },
      ],
      error: null,
    });
    sendNotification.mockResolvedValue({ statusCode: 201 });
    rpc.mockResolvedValueOnce({ error: null });

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ claimed: 1, sent: 1, invalid: 0 });
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "https://fcm.googleapis.com/fcm/send/test",
      }),
      expect.stringContaining("IITIConnect update"),
      expect.any(Object),
    );
    expect(rpc).toHaveBeenLastCalledWith("finish_push_delivery", {
      p_delivery_id: 3,
      p_outcome: "sent",
    });
  });

  it("invalidates untrusted endpoints without sending to them", async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          delivery_id: 5,
          notification_id: 6,
          endpoint: "https://127.0.0.1/private",
          p256dh: "key",
          auth_secret: "auth",
        },
      ],
      error: null,
    });
    rpc.mockResolvedValueOnce({ error: null });

    const response = await POST(request());
    expect(await response.json()).toEqual({ claimed: 1, sent: 0, invalid: 1 });
    expect(sendNotification).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenLastCalledWith("finish_push_delivery", {
      p_delivery_id: 5,
      p_outcome: "invalid",
    });
  });
});
