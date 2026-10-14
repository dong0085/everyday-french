import { expect, type Page } from "@playwright/test";

/** Test-only sign-in (exists only with ALLOW_MOCK_PROVIDERS=1). Each name is its own account. */
export async function signIn(page: Page, who: string) {
  await page.goto("/");
  await page.locator('input[name="who"]').evaluate((el, w) => ((el as HTMLInputElement).value = w), who);
  await page.getByTestId("dev-login").click();
  await page.waitForURL(/\/topics\/|\/$/);
}

/** Connects the mock provider from the "Connect…" sheet. From Settings (`done`), a success panel follows. */
export async function connectMock(page: Page, opts: { done?: boolean } = {}) {
  await page.getByRole("button", { name: /Other providers/ }).click();
  await page.getByRole("button", { name: /Mock \(tests only\)/ }).click();
  await page.getByRole("button", { name: "Use mock provider" }).click();
  // In Settings the sheet then says what was set up; Done closes it. While making a topic, writing starts at once.
  if (opts.done) await page.getByRole("button", { name: "Done" }).click();
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export async function sameOriginPost(page: Page, url: string, json: unknown) {
  return page.evaluate(
    async ([u, body]) => {
      const r = await fetch(u as string, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return { status: r.status, body: await r.json().catch(() => null) };
    },
    [url, json] as const,
  );
}

export { expect };
