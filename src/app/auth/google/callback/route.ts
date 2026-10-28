import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/env";
import { isAllowedGoogleWorkspaceUser } from "../../../../lib/google-workspace";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code || !hasSupabaseConfig())
    return NextResponse.redirect(
      new URL("/auth?status=google-unavailable", request.url),
    );

  const supabase = await createClient();
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");
  const { data, error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );
  if (error) {
    console.warn("Google sign-in callback failed", {
      code: error.code ?? "unknown",
      status: error.status,
    });
    return NextResponse.redirect(
      new URL("/auth?status=google-unavailable", request.url),
    );
  }
  if (!isAllowedGoogleWorkspaceUser(data.user)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/auth?status=google-domain", request.url),
    );
  }
  return NextResponse.redirect(new URL("/community", request.url));
}
