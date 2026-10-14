// Starter ideas for a story. /new?idea=<key> pre-fills only from this fixed map, never from URL text.

export const IDEAS = {
  pharmacy: { label: "At the pharmacy", story: "I went to the pharmacy because I had a sore throat.", start: "Today I went to the pharmacy because " },
  bus: { label: "Buying a bus ticket", story: "I bought a bus ticket and asked which stop to get off at.", start: "Today I bought a bus ticket and " },
  cafe: { label: "Ordering at a café", story: "I ordered a coffee and a croissant, then asked for the bill.", start: "Today I ordered at a café: " },
  doctor: { label: "At the doctor", story: "I saw a doctor about my back and got a prescription.", start: "Today I went to the doctor because " },
  landlord: { label: "Calling the landlord", story: "I called my landlord because the heating stopped working.", start: "Today I called my landlord because " },
  bakery: { label: "At the bakery", story: "I bought bread and asked what a pain aux raisins is.", start: "Today at the bakery I " },
} as const;

export type IdeaKey = keyof typeof IDEAS;
export const IDEA_KEYS = Object.keys(IDEAS) as IdeaKey[];

export function ideaKey(v: unknown): IdeaKey | null {
  return typeof v === "string" && Object.hasOwn(IDEAS, v) ? (v as IdeaKey) : null;
}
