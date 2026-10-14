import { api } from "@/lib/http";
import { getKey } from "@/lib/keys/store";
import { listTextModels } from "@/lib/providers/models";

export const GET = api("none", async ({ req, userId }) => {
  const provider = req.nextUrl.searchParams.get("provider") ?? "";
  const keyId = req.nextUrl.searchParams.get("keyId");
  return { models: await listTextModels(await getKey(userId, provider, keyId)) };
});
