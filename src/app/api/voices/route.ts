import { api } from "@/lib/http";
import { getKey } from "@/lib/keys/store";
import { elevenVoices } from "@/lib/providers/speech";

export const GET = api("none", async ({ userId }) => ({ voices: await elevenVoices(await getKey(userId, "elevenlabs")) }));
