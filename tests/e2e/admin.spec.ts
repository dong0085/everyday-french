import { test } from "@playwright/test";
import { expect, signIn, uid } from "./helpers";

// .env.local sets ADMIN_EMAILS=admin@example.test, which is the test sign-in "admin".
test("only admins see the admin panel; admins can block, unblock and delete accounts", async ({ browser }) => {
  const visitor = await (await browser.newContext()).newPage();
  const who = "v" + uid();
  await signIn(visitor, who);
  await expect(visitor.getByRole("link", { name: "Admin" })).toHaveCount(0);
  await visitor.goto("/settings");
  await expect(visitor.getByRole("link", { name: "Admin panel" })).toHaveCount(0);
  await visitor.goto("/admin");
  await expect(visitor.getByRole("heading", { name: "Not found" })).toBeVisible();
  const forbidden = await visitor.evaluate(async () => {
    const r = await fetch("/api/admin/users/00000000-0000-0000-0000-000000000000", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "block" }) });
    return r.status;
  });
  expect(forbidden).toBe(404);

  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, "admin");
  // The Admin link lives in Settings (Account), not in the header.
  await admin.goto("/settings");
  await admin.getByRole("link", { name: "Admin panel" }).click();
  await expect(admin.getByRole("heading", { name: "Admin", level: 1 })).toBeVisible();
  for (const name of ["Setup", "Numbers", "Free plan room", "Last 30 days", "Recent failures"]) {
    await expect(admin.getByRole("heading", { name, exact: false }).first()).toBeVisible();
  }
  // Topic content never appears: the example topic's title is not on the page.
  await expect(admin.getByText("Au café")).toHaveCount(0);

  await admin.getByRole("searchbox", { name: "Search users" }).fill(who);
  const card = admin.locator(".user").filter({ hasText: `${who}@example.test` });
  await expect(card).toHaveCount(1);
  // On phones each user is one line; open it to see the facts and the actions.
  await card.getByRole("button", { name: new RegExp(who) }).click();

  await card.getByRole("button", { name: "Block" }).click();
  await expect(card.getByText("blocked", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Unblock" }).click();
  await expect(card.getByText("blocked", { exact: true })).toHaveCount(0);

  await card.getByRole("button", { name: "Delete" }).click();
  const sheet = admin.getByRole("dialog", { name: "Delete this account?" });
  const submit = sheet.getByRole("button", { name: "Delete account" });
  await expect(submit).toBeDisabled();
  await sheet.getByRole("textbox").fill(`${who}@example.test`);
  await submit.click();
  await expect(admin.locator(".user").filter({ hasText: `${who}@example.test` })).toHaveCount(0);

  // The admin's own card has no actions.
  await admin.getByRole("searchbox", { name: "Search users" }).fill("admin@example.test");
  const self = admin.locator(".user").filter({ hasText: "admin@example.test" });
  await expect(self.getByText("you", { exact: true })).toBeVisible();
  await self.getByRole("button", { name: /admin@example\.test/ }).click();
  await expect(self.getByText("Topic model")).toBeVisible();
  await expect(self.getByRole("button", { name: /Block|Delete/ })).toHaveCount(0);
});
