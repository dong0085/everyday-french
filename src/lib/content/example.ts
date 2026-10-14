// The example topic every new account starts with, so the app is never empty.
// Written by hand as a model of what a generated topic should look like.
import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { DialogueLine, NextTimeLine, SectionData, Sentence, StoryLine, Who, Word } from "./schema";

type Ex = { fr: string; en: string; zh: string };

const w = (id: string, fr: string, en: string, zh: string, type: Word["type"], ipa: string, extra: Partial<Omit<Word, "example">> & { example: Ex }): Word => ({
  id,
  fr,
  en,
  zh,
  type,
  core: false,
  gender: null,
  plural: null,
  forms: null,
  note: null,
  ipa,
  say: null,
  pattern: null,
  flag: null,
  ...extra,
});
const s = (id: string, who: Who | null, fr: string, en: string, zh: string, extra: { note?: string; say?: string } = {}): Sentence => ({
  id,
  fr,
  en,
  zh,
  note: extra.note ?? null,
  who,
  say: extra.say ?? null,
  mine: false,
  flag: null,
});

const ARRIVER: SectionData = {
  words: [
    w("wx1", "un café", "a café; also: a coffee (an espresso)", "咖啡馆；一杯咖啡", "noun", "/ɛ̃ kafe/", {
      core: true,
      gender: "m",
      plural: "des cafés",
      note: "The same word is the place and the drink.",
      example: { fr: "Il y a un café près d'ici ?", en: "Is there a café near here?", zh: "这附近有咖啡馆吗？" },
    }),
    w("wx2", "une table", "a table", "桌子", "noun", "/yn tabl/", {
      core: true,
      gender: "f",
      say: "End on a soft l, with no vowel after it.",
      example: { fr: "Une table pour deux, s'il vous plaît.", en: "A table for two, please.", zh: "请给我们一张两人桌。" },
    }),
    w("wx3", "le serveur", "the waiter", "服务员（男）", "noun", "/lə sɛʁvœʁ/", {
      core: true,
      gender: "m",
      note: "A waitress is *la serveuse*.",
      say: "Both r are made at the back of the throat, not with the tip of the tongue.",
      example: { fr: "Le serveur arrive.", en: "The waiter is coming.", zh: "服务员来了。" },
    }),
    w("wx4", "attendre", "to wait (for)", "等，等待", "verb", "/atɑ̃dʁ/", {
      core: true,
      forms: "j'attends, vous attendez · passé composé : j'ai attendu",
      note: "No word for “for”: *attendre une table*.",
      say: "In j'attends, the final ds is silent.",
      example: { fr: "J'attends une table.", en: "I'm waiting for a table.", zh: "我在等位子。" },
    }),
    w("wx5", "s'il vous plaît", "please (polite)", "请（礼貌）", "phrase", "/sil vu plɛ/", {
      core: true,
      note: "With friends: *s'il te plaît*.",
      say: "The t of plaît is silent.",
      pattern: "…, s'il vous plaît → un café · l'addition",
      example: { fr: "Un café, s'il vous plaît.", en: "A coffee, please.", zh: "请来一杯咖啡。" },
    }),
    w("wx6", "Vous êtes combien ?", "How many of you are there?", "你们几位？", "phrase", "/vuz‿ɛt kɔ̃bjɛ̃/", {
      note: "The waiter's first question. Answer with a number: *Deux.* or *Une personne.*",
      say: "The s of vous is said z and joins êtes.",
      example: { fr: "Bonjour ! Vous êtes combien ?", en: "Hello! How many of you?", zh: "您好！几位？" },
    }),
    w("wx7", "libre", "free, available", "空的；有空的", "adj", "/libʁ/", {
      forms: "libre · libre",
      example: { fr: "Cette table est libre ?", en: "Is this table free?", zh: "这张桌子没人坐吧？" },
    }),
  ],
  sentences: [
    s("sx1", "them", "Bonjour ! Vous êtes combien ?", "Hello! How many of you?", "您好！几位？"),
    s("sx2", "me", "Bonjour, une table pour une personne, s'il vous plaît.", "Hello, a table for one, please.", "您好，一位，请给我一张桌子。"),
    s("sx3", "them", "Installez-vous où vous voulez.", "Sit wherever you like.", "您随便坐。", { note: "*S'installer* = to sit down, settle in. You will hear it often." }),
    s("sx4", "me", "Cette table est libre ?", "Is this table free?", "这张桌子没人坐吧？", { note: "A statement becomes a question when your voice goes up at the end." }),
    s("sx5", "me", "Je peux m'asseoir en terrasse ?", "Can I sit on the terrace?", "我可以坐在露天座位吗？", { note: "*La terrasse* = the tables outside." }),
  ],
  tips: [{ id: "tx1", title: "Bonjour first", text: "In France, say *Bonjour* before asking anything. Starting without it sounds rude." }],
};

const COMMANDER: SectionData = {
  words: [
    w("wx8", "commander", "to order", "点（菜）", "verb", "/kɔmɑ̃de/", {
      core: true,
      forms: "je commande, vous commandez · passé composé : j'ai commandé",
      example: { fr: "Je peux commander, s'il vous plaît ?", en: "Can I order, please?", zh: "我可以点单吗？" },
    }),
    w("wx9", "Je voudrais…", "I would like…", "我想要……", "phrase", "/ʒə vudʁɛ/", {
      core: true,
      note: "More polite than *Je veux* (I want).",
      say: "ou is the ou of vous, not the u of tu; the final s is silent.",
      pattern: "Je voudrais … → un café crème · l'addition",
      example: { fr: "Je voudrais un café, s'il vous plaît.", en: "I'd like a coffee, please.", zh: "我想要一杯咖啡。" },
    }),
    w("wx10", "l'addition", "the bill", "账单", "noun", "/ladisjɔ̃/", {
      core: true,
      gender: "f",
      note: "In a café you ask for it: it does not come by itself.",
      say: "-tion is said with an s sound and ends in the nasal on.",
      example: { fr: "L'addition, s'il vous plaît.", en: "The bill, please.", zh: "请结账。" },
    }),
    w("wx11", "payer", "to pay", "付钱", "verb", "/peje/", {
      core: true,
      forms: "je paie, vous payez · passé composé : j'ai payé",
      note: "*Je paie* and *je paye* are both correct.",
      example: { fr: "Je peux payer par carte ?", en: "Can I pay by card?", zh: "可以刷卡吗？" },
    }),
    w("wx12", "C'est combien ?", "How much is it?", "多少钱？", "phrase", "/sɛ kɔ̃bjɛ̃/", {
      say: "Two nasal vowels: do not say the m or the n.",
      pattern: "…, c'est combien ? → le croissant · un café crème",
      example: { fr: "Le croissant, c'est combien ?", en: "How much is the croissant?", zh: "牛角包多少钱？" },
    }),
    w("wx13", "un croissant", "a croissant", "牛角面包", "noun", "/ɛ̃ kʁwasɑ̃/", {
      gender: "m",
      plural: "des croissants",
      say: "The final t is silent.",
      example: { fr: "Vous avez encore des croissants ?", en: "Do you still have croissants?", zh: "还有牛角包吗？" },
    }),
    w("wx14", "Vous avez choisi ?", "Have you decided?", "您选好了吗？", "phrase", "/vuz‿ave ʃwazi/", {
      note: "The waiter's question when he comes back. Answer: *Oui, je voudrais…*",
      say: "The s of vous is said z and joins avez.",
      example: { fr: "Bonjour, vous avez choisi ?", en: "Hello, have you decided?", zh: "您好，您选好了吗？" },
    }),
  ],
  sentences: [
    s("sx6", "them", "Bonjour, qu'est-ce que je vous sers ?", "Hello, what can I get you?", "您好，您要点什么？", { note: "A very common question in cafés. *Servir* = to serve." }),
    s("sx7", "me", "Je voudrais un café et un croissant, s'il vous plaît.", "I'd like a coffee and a croissant, please.", "我要一杯咖啡和一个牛角包，谢谢。", { say: "et sounds like é: the t is silent." }),
    s("sx8", "me", "L'addition, s'il vous plaît.", "The bill, please.", "请结账。"),
    s("sx9", "me", "Je peux payer par carte ?", "Can I pay by card?", "可以刷卡吗？"),
    s("sx10", "them", "Oui, je vous apporte la machine.", "Yes, I'll bring you the card machine.", "可以，我把刷卡机拿过来。", { note: "*La machine* here is the card reader." }),
  ],
  tips: [
    { id: "tx2", title: "Un café = an espresso", text: "Ask for *un café allongé* for a longer coffee, or *un café crème* for coffee with milk." },
    { id: "tx3", title: "Paying and tips", text: "In a café you usually pay at the end, at the table or at the counter. Service is already in the price (*service compris*); leaving a little change is kind but not expected." },
  ],
};

const STORY: StoryLine[] = [
  s("rx1", null, "Je suis allé au café.", "I went to the café.", "我去了咖啡馆。", { say: "suis allé: the s can join allé with a z sound." }),
  s("rx2", null, "J'ai dit bonjour au serveur.", "I said hello to the waiter.", "我跟服务员打了招呼。"),
  s("rx3", null, "Il m'a demandé : « Vous êtes combien ? »", "He asked me: “How many of you?”", "他问我：“几位？”"),
  s("rx4", null, "J'ai attendu une table libre.", "I waited for a free table.", "我等着空出一张桌子。"),
  s("rx5", null, "J'ai dit : « Je voudrais un café, s'il vous plaît. »", "I said: “I'd like a coffee, please.”", "我说：“我想要一杯咖啡。”"),
  s("rx6", null, "J'ai aussi commandé un croissant.", "I also ordered a croissant.", "我还点了一个牛角包。"),
  s("rx7", null, "C'était très bon.", "It was very good.", "非常好吃。"),
  s("rx8", null, "Après, j'ai demandé l'addition.", "Afterwards, I asked for the bill.", "之后，我叫服务员结账。"),
  s("rx9", null, "J'ai payé par carte.", "I paid by card.", "我刷卡付了钱。"),
  s("rx10", null, "La prochaine fois, je vais commander un café crème.", "Next time, I'm going to order a coffee with milk.", "下次我要点一杯加奶咖啡。"),
];

const DIALOGUE: DialogueLine[] = [
  s("dx1", "them", "Bonjour ! Vous êtes combien ?", "Hello! How many of you?", "您好！几位？"),
  s("dx2", "me", "Bonjour ! Une personne, s'il vous plaît.", "Hello! Just one, please.", "您好！一位，谢谢。"),
  s("dx3", "them", "Installez-vous. Qu'est-ce que je vous sers ?", "Have a seat. What can I get you?", "请坐。您要点什么？"),
  s("dx4", "me", "Je voudrais un café et un croissant.", "I'd like a coffee and a croissant.", "我要一杯咖啡和一个牛角包。"),
  s("dx5", "them", "Très bien, je vous apporte ça tout de suite.", "Very good, I'll bring it right away.", "好的，马上给您送来。", { note: "*Tout de suite* = right away." }),
  s("dx6", "me", "Merci. Je peux payer par carte ?", "Thank you. Can I pay by card?", "谢谢。可以刷卡吗？"),
  s("dx7", "them", "Bien sûr. Ça fait quatre euros cinquante.", "Of course. That's four euros fifty.", "当然。一共四欧五十。", { say: "fait sounds like è: the t is silent." }),
  s("dx8", "me", "Voilà. Merci, bonne journée !", "Here you go. Thanks, have a nice day!", "给您。谢谢，祝您愉快！"),
];

const NEXT_TIME: NextTimeLine[] = [
  { id: "nx1", fr: "Bonjour, une table pour deux, s'il vous plaît.", en: "Hello, a table for two, please.", zh: "您好，请给我们一张两人桌。" },
  { id: "nx2", fr: "Je voudrais un café crème, s'il vous plaît.", en: "I'd like a coffee with milk, please.", zh: "我想要一杯加奶咖啡。" },
  { id: "nx3", fr: "Est-ce que je peux payer par carte ?", en: "Can I pay by card?", zh: "我可以刷卡吗？" },
];

/** The example content, for tests. */
export const EXAMPLE = { sections: [ARRIVER, COMMANDER], story: STORY, dialogue: DIALOGUE, nextTime: NEXT_TIME };

/** Drops the Chinese gloss when the learner has not asked for it. */
function noZh<T extends { zh: string | null; example?: { zh: string | null } | null }>(items: T[]): T[] {
  return items.map((x) => ({ ...x, zh: null, ...(x.example ? { example: { ...x.example, zh: null } } : {}) }));
}
function sectionFor(d: SectionData, zh: boolean): SectionData {
  return zh ? d : { ...d, words: noZh(d.words), sentences: noZh(d.sentences) };
}

/** Adds the example topic once per account. Returns its id when it was just created. */
export async function seedExample(userId: string): Promise<string | null> {
  const db = adminClient();
  const { data: profile } = await db.from("profiles").select("example_seeded, zh_gloss, l1").eq("id", userId).maybeSingle();
  if (!profile || profile.example_seeded) return null;
  await db.from("profiles").update({ example_seeded: true }).eq("id", userId);
  const zh = profile.zh_gloss;

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
      explain_lang: "en",
      zh_gloss: zh,
      l1: profile.l1,
      status: "ready",
      stage: "done",
      model_used: "example",
      story_fr: zh ? STORY : noZh(STORY),
      dialogue: zh ? DIALOGUE : noZh(DIALOGUE),
      next_time: zh ? NEXT_TIME : noZh(NEXT_TIME),
      gender_note: "A woman writes « je suis allée » (with an extra e). It sounds the same.",
      is_example: true,
    })
    .select("id")
    .single();
  if (error || !topic) return null;
  await db.from("topic_sections").insert([
    { topic_id: topic.id, user_id: userId, position: 0, slug: "arriver", title: "Arriving", title_fr: "Arriver", intro: "Greet first, then ask for a table.", status: "ready", data: sectionFor(ARRIVER, zh), core_words: [] },
    { topic_id: topic.id, user_id: userId, position: 1, slug: "commander", title: "Ordering and paying", title_fr: "Commander et payer", intro: "Polite phrases for ordering and the bill.", status: "ready", data: sectionFor(COMMANDER, zh), core_words: [] },
  ]);
  return topic.id;
}
