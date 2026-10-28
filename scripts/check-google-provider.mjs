import { readFile } from "node:fs/promises";

const env = await readFile(".env.local", "utf8");
const lines = env.split(/\r?\n/);
const line = lines.find((entry) =>
  entry.startsWith("NEXT_PUBLIC_SUPABASE_URL="),
);
const keyLine = lines.find((entry) =>
  entry.startsWith("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="),
);
if (!line) throw new Error("Supabase URL is missing");
if (!keyLine) throw new Error("Supabase publishable key is missing");
const projectUrl = line.slice(line.indexOf("=") + 1);
const publishableKey = keyLine.slice(keyLine.indexOf("=") + 1);
if (new URL(projectUrl).hostname !== "heyfvsldcxxhuxotfyjt.supabase.co")
  throw new Error("This check is restricted to the linked test project");
const response = await fetch(new URL("/auth/v1/settings", projectUrl), {
  headers: { apikey: publishableKey },
});
if (!response.ok)
  throw new Error(`Auth settings request failed: ${response.status}`);
const settings = await response.json();
console.log(
  JSON.stringify({ googleEnabled: settings.external?.google === true }),
);
