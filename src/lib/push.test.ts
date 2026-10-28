import { describe, expect, it } from "vitest";
import { isTrustedPushEndpoint } from "./push";

describe("push endpoint validation", () => {
  it("accepts standard browser push services", () => {
    expect(
      isTrustedPushEndpoint("https://fcm.googleapis.com/fcm/send/device"),
    ).toBe(true);
    expect(
      isTrustedPushEndpoint(
        "https://updates.push.services.mozilla.com/wpush/v2/device",
      ),
    ).toBe(true);
    expect(isTrustedPushEndpoint("https://web.push.apple.com/device")).toBe(
      true,
    );
  });

  it("rejects arbitrary hosts, deceptive suffixes and local addresses", () => {
    expect(
      isTrustedPushEndpoint("https://fcm.googleapis.com.attacker.test/x"),
    ).toBe(false);
    expect(isTrustedPushEndpoint("https://127.0.0.1/x")).toBe(false);
    expect(isTrustedPushEndpoint("http://fcm.googleapis.com/x")).toBe(false);
    expect(isTrustedPushEndpoint("https://fcm.googleapis.com:8443/x")).toBe(
      false,
    );
  });
});
