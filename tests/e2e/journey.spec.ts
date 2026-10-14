import { test } from "@playwright/test";
import { connectMock, expect, signIn, uid } from "./helpers";

test("first visit → example → make a topic → audio → study → search → review → save for later", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));

  // First sign-in lands on the example topic, with no setup asked.
  await signIn(page, "j" + uid());
  await expect(page).toHaveURL(/\/topics\/.+welcome=1/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Commander au café");
  await expect(page.getByText("un café", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".g-m").first()).toBeVisible();

  // Make a topic: the AI setup appears only at Generate, and generation then starts by itself.
  await page.getByRole("link", { name: /Make your own/ }).click();
  await expect(page.getByRole("heading", { name: "What happened?" })).toBeVisible();
  await page.getByRole("button", { name: /^A1/ }).click();
  await page.getByRole("button", { name: /elle/ }).click();
  await page.locator("textarea").fill("Hier, j'ai cherché une voiture d'occasion sur Leboncoin. I called the seller, took a test drive and paid 9 500 €.");
  await page.getByTestId("generate").click();
  await expect(page.getByRole("dialog", { name: "Connect an AI account" })).toBeVisible();
  await connectMock(page);
  await page.waitForURL(/\/topics\/[0-9a-f-]+$/);

  // The background job fills the page; sections, My story and review flags appear.
  await expect(page.getByRole("heading", { name: "Chercher en ligne" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Mon histoire" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Checking the French|Writing/)).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Use suggestion" }).first()).toBeVisible();
  await page.getByRole("button", { name: "It's fine" }).first().click();

  // No voice yet → device voice, with a link to set up natural audio.
  const topicUrl = page.url();
  await page.getByRole("link", { name: "Set up natural audio" }).click();
  await page.locator("#voice").getByRole("button", { name: "Connect an account" }).click();
  await connectMock(page);
  await expect(page.locator("#voice")).toContainText("Mock voice");

  // One-tap audio for the whole topic.
  await page.goto(topicUrl);
  await page.getByTestId("audio-open").click();
  await page.getByTestId("audio-run").click();
  await expect(page.getByText("Audio ready.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("audio-open")).toHaveCount(0);
  await expect(page.locator(".icon-btn.device")).toHaveCount(0); // every line now has a recording

  // Quiz mode is remembered and hides the French.
  await page.getByRole("button", { name: "Hide French", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-mode", "hide-fr");
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute("data-mode", "hide-fr");
  await page.getByRole("button", { name: "Show all", exact: true }).click();

  // Edit a sentence.
  await page.getByRole("button", { name: /More/ }).click();
  await page.getByRole("button", { name: "Edit this topic" }).click();
  await page.locator("#story").getByRole("button", { name: "Edit line" }).first().click();
  await page.locator("#story input").first().fill("J'ai cherché une petite voiture.");
  const saved = page.waitForResponse((r) => r.request().method() === "PATCH" && r.url().includes("/api/topics/"));
  await page.locator("#story").getByRole("button", { name: "Save" }).click();
  expect((await saved).status()).toBe(200);
  await page.reload();
  await expect(page.getByText("J'ai cherché une petite voiture.")).toBeVisible();

  // Search across topics, accent-insensitive.
  await page.goto("/");
  await page.getByPlaceholder(/Search every topic/).fill("kilometrage");
  await expect(page.getByText("le kilométrage").first()).toBeVisible();

  // Review deck.
  await page.goto("/review");
  await expect(page.getByText(/1 \/ \d+/)).toBeVisible();
  await page.getByRole("button", { name: /Next/ }).click();
  await expect(page.getByText(/2 \/ \d+/)).toBeVisible();

  // Save for later, then turn the saved note into a topic later.
  await page.goto("/new");
  await page.locator("textarea").fill("Pharmacy: I asked for something for a sore throat.");
  await page.getByRole("button", { name: "Save for later" }).click();
  await expect(page.getByText(/Saved for later \(1\)/)).toBeVisible();
  await page.getByRole("link", { name: "Make topic" }).click();
  await expect(page.locator("textarea")).toHaveValue(/sore throat/);

  // Export.
  const res = await page.request.get("/api/export");
  expect(res.status()).toBe(200);
  const file = await res.json();
  expect(file.format).toBe("everyday-french/v1");
  expect(file.topics.length).toBeGreaterThanOrEqual(2);

  expect(errors, errors.join("\n")).toEqual([]);
});
