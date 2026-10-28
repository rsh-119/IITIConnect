import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { matchesBearer } from "../../../../lib/bearer";

export const runtime = "nodejs";
export const maxDuration = 30;

// Daily 90-day purge. Shares the scheduler token with the push sender.
export async function POST(request: NextRequest) {
  const schedulerSecret = process.env.PUSH_DISPATCH_SECRET;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!schedulerSecret || !serviceKey || !url)
    return NextResponse.json(
      { error: "Retention job unavailable" },
      { status: 503 },
    );
  if (!matchesBearer(request.headers.get("authorization"), schedulerSecret))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("purge_expired_content");
  if (error) {
    console.error("Retention purge failed", { code: error.code });
    return NextResponse.json(
      { error: "Retention purge unavailable" },
      { status: 503 },
    );
  }
  const images = (data ?? []) as string[];
  let imageFailures = 0;
  for (let at = 0; at < images.length; at += 100) {
    const { error: removeError } = await supabase.storage
      .from("item-images")
      .remove(images.slice(at, at + 100));
    if (removeError) {
      imageFailures += 1;
      console.error("Retention image removal failed", {
        name: removeError.name,
      });
    }
  }
  return NextResponse.json(
    { images: images.length, imageFailures },
    { status: imageFailures ? 207 : 200 },
  );
}
