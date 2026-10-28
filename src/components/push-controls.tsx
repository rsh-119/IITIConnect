"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/app/community/settings/push-actions";

function applicationServerKey(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const bytes = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

export function PushControls({ publicKey }: { publicKey?: string }) {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [iosInstallNeeded, setIosInstallNeeded] = useState(false);

  useEffect(() => {
    let active = true;
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const available =
      Boolean(publicKey) &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      window.isSecureContext;
    void Promise.resolve().then(() => {
      if (active) {
        setIosInstallNeeded(isIos && !standalone);
        setSupported(available);
      }
    });
    if (available)
      void navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => {
          if (active) setEnabled(Boolean(subscription));
        })
        .catch(() => {
          if (active) setSupported(false);
        });
    return () => {
      active = false;
    };
  }, [publicKey]);

  async function enable() {
    if (!publicKey || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(
          "Browser notifications are blocked. In-app alerts still work.",
        );
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(publicKey),
        }));
      const json = subscription.toJSON();
      const result = await savePushSubscription({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      });
      if (!result.ok) {
        if (!existing) await subscription.unsubscribe();
        setMessage("Could not save this device. Try again later.");
        return;
      }
      setEnabled(true);
      setMessage("Push alerts are enabled for this device.");
      router.refresh();
    } catch {
      setMessage("Push alerts could not be enabled on this device.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const result = await removePushSubscription(subscription.endpoint);
        if (!result.ok || !(await subscription.unsubscribe())) {
          setMessage("Could not disable this device. Try again later.");
          return;
        }
      }
      setEnabled(false);
      setMessage("Push alerts are off for this device.");
      router.refresh();
    } catch {
      setMessage("Could not disable this device. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Browser push alerts</h2>
      <p className="mt-2 text-sm text-slate-600">
        Get a brief alert for messages and requests. Private details stay in the
        app. In-app alerts are always available.
      </p>
      {iosInstallNeeded && (
        <p className="mt-3 text-sm text-slate-600">
          On iPhone or iPad, add IITIConnect to your Home Screen, then open it
          there to enable push alerts.
        </p>
      )}
      {supported && !iosInstallNeeded ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void (enabled ? disable() : enable())}
          className="border-accent text-accent mt-5 min-h-11 rounded-lg border px-4 font-semibold disabled:opacity-50"
        >
          {busy ? "Please wait…" : enabled ? "Turn off push" : "Enable push"}
        </button>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          Push alerts are unavailable in this browser or have not been
          configured yet.
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm text-slate-700">
          {message}
        </p>
      )}
    </section>
  );
}
