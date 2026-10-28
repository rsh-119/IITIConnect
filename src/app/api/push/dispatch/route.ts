import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import webPush from "web-push";
import { matchesBearer } from "../../../../lib/bearer";
import { isTrustedPushEndpoint } from "../../../../lib/push";

export const runtime = "nodejs";
export const maxDuration = 30;

type Delivery = {
  delivery_id: number;
  notification_id: number;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
};

export async function POST(request: NextRequest) {
  const dispatchSecret = process.env.PUSH_DISPATCH_SECRET;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (
    !dispatchSecret ||
    !serviceKey ||
    !url ||
    !publicKey ||
    !privateKey ||
    !subject
  )
    return NextResponse.json(
      { error: "Push sender unavailable" },
      { status: 503 },
    );
  if (!matchesBearer(request.headers.get("authorization"), dispatchSecret))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("claim_push_deliveries", {
    p_limit: 10,
  });
  if (error) {
    console.error("Push queue claim failed", { code: error.code });
    return NextResponse.json(
      { error: "Push queue unavailable" },
      { status: 503 },
    );
  }

  const deliveries = (data ?? []) as Delivery[];
  const results = await Promise.all(
    deliveries.map(async (delivery) => {
      let outcome: "sent" | "invalid" | "retry" = "retry";
      if (!isTrustedPushEndpoint(delivery.endpoint)) {
        outcome = "invalid";
      } else {
        try {
          await webPush.sendNotification(
            {
              endpoint: delivery.endpoint,
              keys: { p256dh: delivery.p256dh, auth: delivery.auth_secret },
            },
            JSON.stringify({
              title: "IITIConnect update",
              path: "/community/notifications",
              tag: `notification-${delivery.notification_id}`,
            }),
            {
              TTL: 3600,
              timeout: 10000,
              vapidDetails: { subject, publicKey, privateKey },
            },
          );
          outcome = "sent";
        } catch (reason) {
          const status =
            typeof reason === "object" &&
            reason !== null &&
            "statusCode" in reason
              ? Number(reason.statusCode)
              : 0;
          outcome = status === 404 || status === 410 ? "invalid" : "retry";
        }
      }
      const { error: finishError } = await supabase.rpc(
        "finish_push_delivery",
        {
          p_delivery_id: delivery.delivery_id,
          p_outcome: outcome,
        },
      );
      if (finishError)
        console.error("Push queue finish failed", { code: finishError.code });
      return outcome;
    }),
  );
  return NextResponse.json({
    claimed: deliveries.length,
    sent: results.filter((result) => result === "sent").length,
    invalid: results.filter((result) => result === "invalid").length,
  });
}
