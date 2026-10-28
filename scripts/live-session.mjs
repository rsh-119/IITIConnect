// The app only offers Google sign-in, which a script cannot complete. Live QA
// scripts instead sign a fictional test-project user in server-side and hand
// the browser the same SSR session cookies the app would have set.
import { createServerClient } from "@supabase/ssr";

export async function signInBrowser(context, settings, email, password) {
  let cookies = [];
  const client = createServerClient(
    settings.NEXT_PUBLIC_SUPABASE_URL,
    settings.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { cookies: { getAll: () => [], setAll: (set) => (cookies = set) } },
  );
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Test sign-in: ${error.code ?? "unknown"}`);
  // Cookies are written after the session is saved.
  for (let attempt = 0; !cookies.length && attempt < 20; attempt += 1)
    await new Promise((resolve) => setTimeout(resolve, 50));
  if (!cookies.length) throw new Error("Test sign-in produced no session");
  await context.addCookies(
    cookies.map(({ name, value }) => ({
      name,
      value,
      url: "http://localhost:3000",
    })),
  );
}
