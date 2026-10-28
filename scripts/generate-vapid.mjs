import { readFileSync, appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import webPush from "web-push";

const envFile = ".env.local";
const current = readFileSync(envFile, "utf8");
let additions = "";
if (!/^NEXT_PUBLIC_VAPID_PUBLIC_KEY=.+/m.test(current)) {
  const projectUrl = current
    .match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]
    ?.trim();
  if (!projectUrl)
    throw new Error("Configure Supabase before generating VAPID keys");
  const { publicKey, privateKey } = webPush.generateVAPIDKeys();
  additions += `\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}\nVAPID_SUBJECT=${projectUrl}\n`;
}
if (!/^PUSH_DISPATCH_SECRET=.+/m.test(current))
  additions += `PUSH_DISPATCH_SECRET=${randomBytes(32).toString("base64url")}\n`;
if (additions) appendFileSync(envFile, additions);
console.log(
  "Local push credentials are configured in the ignored environment file.",
);
