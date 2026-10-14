// The example topic every new account starts with, so the app is never empty.
import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { SectionData, StoryLine } from "./schema";

const w = (id: string, fr: string, en: string, type: SectionData["words"][number]["type"], extra: Partial<SectionData["words"][number]> = {}) => ({
  id,
  fr,
  en,
  zh: null,
  type,
  core: false,
  gender: null,
  plural: null,
  forms: null,
  note: null,
  example: null,
  flag: null,
  ...extra,
});
const s = (id: string, fr: string, en: string, note: string | null = null) => ({ id, fr, en, zh: null, note, flag: null });

const ARRIVER: SectionData = {
  words: [
    w("wx1", "un café", "a café; also: a coffee (espresso)", "noun", { core: true, gender: "m", plural: "des cafés", example: { fr: "Je vais au café.", en: "I'm going to the café." } }),
    w("wx2", "une table", "a table", "noun", { core: true, gender: "f", example: { fr: "Une table pour deux, s'il vous plaît.", en: "A table for two, please." } }),
    w("wx3", "le serveur", "the waiter", "noun", { core: true, gender: "m", note: "A waitress is *la serveuse*.", example: { fr: "Le serveur arrive.", en: "The waiter is coming." } }),
    w("wx4", "attendre", "to wait (for)", "verb", {
      core: true,
      forms: "j'attends, vous attendez · passé composé : j'ai attendu",
      note: "No word for “for”: *attendre une table*.",
      example: { fr: "J'attends une table.", en: "I'm waiting for a table." },
    }),
    w("wx5", "s'il vous plaît", "please (polite)", "phrase", { core: true, note: "With friends: *s'il te plaît*.", example: { fr: "Un café, s'il vous plaît.", en: "A coffee, please." } }),
    w("wx6", "libre", "free, available", "adj", { forms: "libre · libre", example: { fr: "Cette table est libre ?", en: "Is this table free?" } }),
  ],
  sentences: [
    s("sx1", "Bonjour, une table pour une personne, s'il vous plaît.", "Hello, a table for one, please."),
    s("sx2", "Cette table est libre ?", "Is this table free?", "A statement becomes a question when your voice goes up at the end."),
    s("sx3", "J'attends un ami.", "I'm waiting for a friend."),
  ],
  tips: [{ id: "tx1", title: "Bonjour first", text: "In France, say *Bonjour* before asking anything. Starting without it sounds rude." }],
};

const COMMANDER: SectionData = {
  words: [
    w("wx7", "commander", "to order", "verb", { core: true, forms: "je commande, vous commandez · passé composé : j'ai commandé", example: { fr: "Je commande un croissant.", en: "I'm ordering a croissant." } }),
    w("wx8", "Je voudrais…", "I would like…", "phrase", { core: true, note: "More polite than *Je veux* (I want).", example: { fr: "Je voudrais un café, s'il vous plaît.", en: "I'd like a coffee, please." } }),
    w("wx9", "l'addition", "the bill", "noun", { core: true, gender: "f", example: { fr: "L'addition, s'il vous plaît.", en: "The bill, please." } }),
    w("wx10", "payer", "to pay", "verb", { core: true, forms: "je paie, vous payez · passé composé : j'ai payé", example: { fr: "Je peux payer par carte ?", en: "Can I pay by card?" } }),
    w("wx11", "C'est combien ?", "How much is it?", "phrase", { example: { fr: "Le croissant, c'est combien ?", en: "How much is the croissant?" } }),
    w("wx12", "un croissant", "a croissant", "noun", { gender: "m", example: { fr: "Je mange un croissant.", en: "I'm eating a croissant." } }),
  ],
  sentences: [
    s("sx4", "Je voudrais un café et un croissant, s'il vous plaît.", "I'd like a coffee and a croissant, please."),
    s("sx5", "Je peux payer par carte ?", "Can I pay by card?"),
    s("sx6", "L'addition, s'il vous plaît.", "The bill, please."),
  ],
  tips: [{ id: "tx2", title: "Un café = an espresso", text: "Ask for *un café allongé* for a longer coffee, or *un café crème* for coffee with milk." }],
};

const STORY: StoryLine[] = [
  s("rx1", "Je suis allé au café.", "I went to the café."),
  s("rx2", "J'ai dit bonjour au serveur.", "I said hello to the waiter."),
  s("rx3", "J'ai attendu une table libre.", "I waited for a free table."),
  s("rx4", "Je voudrais un café, s'il vous plaît.", "I'd like a coffee, please."),
  s("rx5", "J'ai commandé un café et un croissant.", "I ordered a coffee and a croissant."),
  s("rx6", "C'était très bon.", "It was very good."),
  s("rx7", "Après, j'ai demandé l'addition.", "Afterwards, I asked for the bill."),
  s("rx8", "J'ai payé par carte.", "I paid by card."),
];

/** Adds the example topic once per account. Returns its id when it was just created. */
export async function seedExample(userId: string): Promise<string | null> {
  const db = adminClient();
  const { data: profile } = await db.from("profiles").select("example_seeded").eq("id", userId).maybeSingle();
  if (!profile || profile.example_seeded) return null;
  await db.from("profiles").update({ example_seeded: true }).eq("id", userId);

  const { data: topic, error } = await db
    .from("topics")
    .insert({
      user_id: userId,
      title: "Ordering at a café",
      title_fr: "Commander au café",
      summary: "An example topic made from a three-sentence story: “I went to a café, waited for a table, ordered a coffee and a croissant, and paid by card.”",
      story: "I went to a café, waited for a table, ordered a coffee and a croissant, and paid by card.",
      source_text: "I went to a café, waited for a table, ordered a coffee and a croissant, and paid by card.",
      level: "A2",
      status: "ready",
      stage: "done",
      model_used: "example",
      story_fr: STORY,
      gender_note: "A woman writes « je suis allée » (with an extra e). It sounds the same.",
      is_example: true,
    })
    .select("id")
    .single();
  if (error || !topic) return null;
  await db.from("topic_sections").insert([
    { topic_id: topic.id, user_id: userId, position: 0, slug: "arriver", title: "Arriving", title_fr: "Arriver", intro: "Greet first, then ask for a table.", status: "ready", data: ARRIVER, core_words: [] },
    { topic_id: topic.id, user_id: userId, position: 1, slug: "commander", title: "Ordering and paying", title_fr: "Commander et payer", intro: "Polite phrases for ordering and the bill.", status: "ready", data: COMMANDER, core_words: [] },
  ]);
  return topic.id;
}
