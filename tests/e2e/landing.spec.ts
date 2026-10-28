import { expect, test } from "@playwright/test";

test("landing page labels its sample lineup", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Going to the city/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Sample lineup for illustration.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Not officially endorsed by IIT Indore", { exact: false }),
  ).toBeVisible();
});

test("landing page fits a narrow phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Going to the city/ }),
  ).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("community requires a verified account", async ({ page }) => {
  await page.goto("/community");
  await expect(page).toHaveURL(/\/auth$/);
  await expect(
    page.getByRole("heading", { name: "Join your campus community" }),
  ).toBeVisible();
});

test("protected workflow routes reject a visitor", async ({ page }) => {
  for (const path of [
    "/community/trips/new",
    "/community/messages",
    "/community/moderation",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/auth$/);
    await expect(
      page.getByRole("heading", { name: "Join your campus community" }),
    ).toBeVisible();
  }
});

test("account entry offers only campus Google sign-in", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign in" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toHaveCount(0);
});

test("account entry fits a small phone in configured or setup mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/auth");
  const google = page.getByRole("button", {
    name: "Continue with IIT Indore Google",
  });
  if (await google.count()) {
    await expect(google).toBeVisible();
  } else {
    await expect(
      page.getByText(
        "Sign-in is unavailable until the project owner configures Supabase.",
      ),
    ).toBeVisible();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});

test("account entry explains a non-campus Google account", async ({ page }) => {
  await page.goto("/auth?status=google-domain");
  await expect(page.getByRole("status")).toHaveText(
    "Choose your IIT Indore Google account ending in @iiti.ac.in.",
  );
});

test("Google sign-in starts a scoped Supabase OAuth request", async ({
  page,
}) => {
  await page.goto("/auth");
  const button = page.getByRole("button", {
    name: "Continue with IIT Indore Google",
  });
  if (!(await button.count())) return;
  let authorizeUrl: URL | undefined;
  await page.route("**/auth/v1/authorize**", async (route) => {
    authorizeUrl = new URL(route.request().url());
    await route.fulfill({ status: 200, body: "OAuth request captured" });
  });
  await button.click();
  await expect(page.getByText("OAuth request captured")).toBeVisible();
  expect(authorizeUrl?.searchParams.get("provider")).toBe("google");
  expect(authorizeUrl?.searchParams.get("redirect_to")).toBe(
    "http://localhost:3000/auth/google/callback",
  );
  expect(authorizeUrl?.searchParams.get("hd")).toBe("iiti.ac.in");
  expect(authorizeUrl?.searchParams.get("prompt")).toBe("select_account");
});

test("PWA assets and baseline security headers are served", async ({
  request,
}) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  const data = await manifest.json();
  expect(data.display).toBe("standalone");
  expect(data.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(
    expect.arrayContaining(["192x192", "512x512"]),
  );
  expect((await request.get("/icon-192.png")).ok()).toBe(true);
  const worker = await request.get("/sw.js");
  expect(worker.ok()).toBe(true);
  expect(await worker.text()).toContain('cache.add("/offline.html")');
  expect((await request.get("/offline.html")).ok()).toBe(true);
  const home = await request.get("/");
  expect(home.headers()["x-frame-options"]).toBe("DENY");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  const privateRoute = await request.get("/community", { maxRedirects: 0 });
  expect(privateRoute.headers()["cache-control"]).toContain("no-store");
});

test("Google sign-in is reachable by keyboard", async ({ page }) => {
  await page.goto("/auth");
  await page.getByRole("link", { name: "IITIConnect home" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Continue with IIT Indore Google" }),
  ).toBeFocused();
});

test("the service worker registers on a local secure context", async ({
  page,
}) => {
  await page.goto("/");
  const workerScript = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL;
  });
  expect(workerScript).toContain("/sw.js");
});

test("installed app explains an offline navigation without cached private data", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Playwright's offline mode does not cover service worker fetches outside Chromium",
  );
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.context().setOffline(true);
  await page.goto("/community");
  await expect(
    page.getByRole("heading", { name: "You are offline" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Try again" })).toHaveAttribute(
    "href",
    "/community",
  );
  expect(await page.evaluate(() => caches.keys())).toEqual([
    "iiticonnect-offline-v1",
  ]);
  await page.context().setOffline(false);
  await page.getByRole("link", { name: "Try again" }).click();
  await expect(page).toHaveURL(/\/auth$/);
});
