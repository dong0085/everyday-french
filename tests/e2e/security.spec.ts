import { test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expect, sameOriginPost, signIn, uid } from "./helpers";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

test("users only see their own data; cross-site and unauthenticated requests are refused", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  await signIn(a, "a" + uid());
  const topicId = a.url().match(/topics\/([0-9a-f-]+)/)![1];
  expect((await a.request.get(`/api/topics/${topicId}`)).status()).toBe(200);

  const b = await (await browser.newContext()).newPage();
  await signIn(b, "b" + uid());
  // Another user's topic is invisible (RLS), through the API and the page.
  expect((await b.request.get(`/api/topics/${topicId}`)).status()).toBe(404);
  await b.goto(`/topics/${topicId}`);
  await expect(b.getByRole("heading", { name: "Not found" })).toBeVisible();
  // Editing it does nothing either.
  const del = await b.evaluate(async (id) => (await fetch(`/api/topics/${id}`, { method: "DELETE" })).status, topicId);
  expect(del).toBe(200);
  expect((await a.request.get(`/api/topics/${topicId}`)).status()).toBe(200);

  // Cross-site POST (no same-origin headers) is refused.
  const cross = await b.request.post("/api/topics", { data: { text: "This should never be accepted." }, headers: { Origin: "https://evil.example" } });
  expect(cross.status()).toBe(403);

  // Signed-out API calls are refused.
  const anon = await (await browser.newContext()).request.get("http://localhost:3100/api/keys");
  expect(anon.status()).toBe(401);

  // Cron endpoint: hidden without the secret, works with it.
  expect((await anon.dispose(), (await (await browser.newContext()).request.get("http://localhost:3100/api/cron/keepalive")).status())).toBe(404);
  const ok = await (await browser.newContext()).request.get("http://localhost:3100/api/cron/keepalive", { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
  expect(ok.status()).toBe(200);

  // Bad keys and unsafe custom endpoints are rejected before anything is stored.
  const ssrf = await sameOriginPost(b, "/api/keys", { provider: "custom", key: "sk-test-12345678", baseUrl: "https://169.254.169.254/v1" });
  expect(ssrf.status).toBe(400);
  expect(ssrf.body.error.code).toBe("unsafe_url");
  const bad = await sameOriginPost(b, "/api/keys", { provider: "openai", key: "sk-not-a-real-key-123456" });
  expect(bad.status).toBe(400);
  expect(bad.body.error.code).toBe("bad_key");
  expect(JSON.stringify(bad.body)).not.toContain("sk-not-a-real");

  // Import refuses files that are not exports, and never trusts their shape.
  const imp = await sameOriginPost(b, "/api/import", { format: "everyday-french/v1", topics: [{ title: "<script>alert(1)</script>", topic_sections: [] }] });
  expect(imp.status).toBe(400);
});
