import { describe, expect, it } from "vitest";
import { addDays, faceFor, pickToday, reviewLinesOf, schedule, todayIn, topicLines, type TopicContent } from "@/lib/review";
import { buildTiles, dictationDiff, findCloze, shuffledOrder } from "@/components/review/cards";
import { sectionDataSchema, sentenceSchema } from "@/lib/content/schema";

const word = (id: string, fr: string, type: string, core: boolean, example: string | null = null) => ({
  id,
  fr,
  en: "…",
  type,
  core,
  example: example ? { fr: example, en: "…" } : null,
});
const line = (id: string, fr: string, extra: Record<string, unknown> = {}) => sentenceSchema.parse({ id, fr, en: "…", ...extra });

const topic: TopicContent = {
  sections: [
    {
      data: sectionDataSchema.parse({
        words: [
          word("w1", "une table", "noun", true, "Une table pour deux, s'il vous plaît."),
          word("w2", "attendre", "verb", true, "J'attends une table."),
          word("w3", "libre", "adj", false, "Cette table est libre ?"),
          word("w4", "Je voudrais…", "phrase", true),
        ],
        sentences: [
          line("s1", "Vous avez réservé ?", { who: "them" }),
          line("s2", "Non, une table pour une personne.", { who: "me" }),
          line("s3", "Je peux payer par carte ?"), // who unknown (older topics)
          line("s4", "J'ai attendu dix minutes.", { who: "me", mine: true }),
        ],
      }),
    },
  ],
  storyFr: [line("r1", "Je suis allé au café.")],
  dialogue: [line("d1", "Bonjour, vous désirez ?", { who: "them" }), line("d2", "Un café, s'il vous plaît.", { who: "me" })],
};

describe("reviewLinesOf", () => {
  const ids = (s?: Set<string>) => reviewLinesOf(topic, s).map((l) => `${l.lineId}:${l.kind}`);
  it("takes core words, phrases, my lines, story and my dialogue lines", () =>
    expect(ids()).toEqual(["w1:word", "w2:word", "w4:phrase", "s2:sentence", "s3:sentence", "s4:mine", "r1:story", "d2:dialogue"]));
  it("adds extra words only when starred", () => expect(ids(new Set(["w3"]))).toContain("w3:word"));
  it("never adds lines the other person says, even if starred", () => expect(ids(new Set(["s1", "d1"]))).not.toContain("s1:sentence"));
  it("lists them lines for practice decks", () => expect(topicLines(topic).filter((l) => l.kind === "them").map((l) => l.lineId)).toEqual(["s1", "d1"]));
});

describe("schedule", () => {
  const item = { box: 0, reps: 0, lapses: 0 };
  it("got moves up a box: 3 → 7 → 14 → 30 days", () => {
    expect(schedule(item, "got", "2026-10-14")).toEqual({ box: 1, reps: 1, lapses: 0, due_on: "2026-10-17" });
    expect(schedule({ ...item, box: 1 }, "got", "2026-10-14").due_on).toBe("2026-10-21");
    expect(schedule({ ...item, box: 3 }, "got", "2026-10-14").due_on).toBe("2026-11-13");
  });
  it("caps at box 5, coming back monthly", () => expect(schedule({ ...item, box: 5 }, "got", "2026-10-14")).toMatchObject({ box: 5, due_on: "2026-11-13" }));
  it("again goes back to box 0, tomorrow, and counts a lapse", () =>
    expect(schedule({ box: 4, reps: 6, lapses: 1 }, "again", "2026-12-31")).toEqual({ box: 0, reps: 7, lapses: 2, due_on: "2027-01-01" }));
  it("skip keeps the box and comes back tomorrow", () => expect(schedule({ box: 2, reps: 3, lapses: 0 }, "skip", "2026-10-14")).toEqual({ box: 2, reps: 3, lapses: 0, due_on: "2026-10-15" }));
});

describe("dates", () => {
  const noon = Date.parse("2026-10-14T12:00:00Z");
  it("adds days across months", () => expect(addDays("2026-02-28", 1)).toBe("2026-03-01"));
  it("accepts the learner's date within a day of UTC", () => {
    expect(pickToday("2026-10-15", noon)).toBe("2026-10-15");
    expect(pickToday("2026-10-13", noon)).toBe("2026-10-13");
  });
  it("falls back to UTC for far or broken dates", () => {
    expect(pickToday("2026-10-20", noon)).toBe("2026-10-14");
    expect(pickToday("2026-02-31", noon)).toBe("2026-10-14");
    expect(pickToday("yesterday", noon)).toBe("2026-10-14");
    expect(pickToday(undefined, noon)).toBe("2026-10-14");
  });
  it("finds today in a time zone", () => {
    expect(todayIn("Asia/Shanghai", Date.parse("2026-10-14T20:00:00Z"))).toBe("2026-10-15");
    expect(todayIn("Not/AZone", noon)).toBe("2026-10-14");
  });
});

describe("cloze", () => {
  it("cuts the whole headword", () => expect(findCloze("une table", "noun", "Une table pour deux, s'il vous plaît.")).toEqual({ before: "", answer: "Une table", after: " pour deux, s'il vous plaît." }));
  it("falls back to the noun without its article", () => expect(findCloze("un café", "noun", "Je vais au café.")?.answer).toBe("café"));
  it("finds a conjugated verb by its stem", () => expect(findCloze("attendre", "verb", "J'attends une table.")).toEqual({ before: "J'", answer: "attends", after: " une table." }));
  it("ignores accents and case, keeps the original text", () => expect(findCloze("l'addition", "noun", "L’addition, s’il vous plaît.")?.answer).toBe("L’addition"));
  it("handles phrases with a slot or a question mark", () => {
    expect(findCloze("Je voudrais…", "phrase", "Je voudrais un café, s'il vous plaît.")?.answer).toBe("Je voudrais");
    expect(findCloze("C'est combien ?", "phrase", "Le croissant, c'est combien ?")?.answer).toBe("c'est combien");
  });
  it("does not match inside another word", () => expect(findCloze("le vin", "noun", "Il vient demain.")).toBeNull());
  it("returns null when the example lacks the word", () => expect(findCloze("payer", "verb", "Je voudrais la carte.")).toBeNull());
});

describe("build tiles", () => {
  it("keeps fixed chunks and articles with their noun", () =>
    expect(buildTiles("Je voudrais un café et un croissant, s'il vous plaît.")).toEqual(["Je voudrais", "un café", "et", "un croissant,", "s'il vous plaît."]));
  it("keeps est-ce que together", () => expect(buildTiles("Est-ce que vous avez une table libre ?")).toContain("Est-ce que"));
  it("keeps elisions in one tile", () => expect(buildTiles("J'ai attendu le serveur dix minutes.")).toContain("J'ai"));
  it("splits again when gluing leaves too few tiles", () => expect(buildTiles("Je peux payer par carte ?")).toEqual(["Je", "peux", "payer", "par carte ?"]));
  it("is null for very short lines", () => expect(buildTiles("Merci beaucoup !")).toBeNull());
  it("never makes more than 7 tiles", () => expect(buildTiles("Hier je suis allé au marché avec mon frère et nous avons acheté des pommes rouges.")!.length).toBeLessThanOrEqual(7));
  it("shuffles into a different order", () => {
    let k = 0;
    const seq = [0.99, 0.99, 0.99, 0.99, 0.99]; // a rand that would keep the order
    const order = shuffledOrder(4, () => seq[k++ % seq.length]);
    expect(order).not.toEqual([0, 1, 2, 3]);
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
  });
});

describe("card faces", () => {
  const lines = topicLines(topic);
  const get = (id: string) => lines.find((l) => l.lineId === id)!;
  it("words with their word in the example are cloze cards", () => expect(faceFor(get("w1"), 0).face).toBe("cloze"));
  it("words without an example ask for the French", () => expect(faceFor(get("w4"), 0).face).toBe("meaning"));
  it("them lines are listen first", () => expect(faceFor(get("s1"), 0).face).toBe("listen"));
  it("new sentences never build; known ones sometimes do", () => {
    expect(faceFor(get("s2"), 0, { rand: () => 0 }).face).toBe("meaning");
    const built = faceFor(get("s2"), 1, { rand: () => 0 });
    expect(built.face).toBe("build");
    expect(built.tiles!.join(" ")).toBe("Non, une table pour une personne.");
  });
});

describe("dictation", () => {
  it("is exact when only punctuation and case differ", () => expect(dictationDiff("Je suis allé au café.", "je suis allé au café").exact).toBe(true));
  it("spots missing accents", () => {
    const d = dictationDiff("Je suis allé au café.", "je suis alle au cafe");
    expect(d.accentsOnly).toBe(true);
    expect(d.chars.filter((c) => c.status === "accent").map((c) => c.ch)).toEqual(["é", "é"]);
  });
  it("marks silent letters the learner left out", () => {
    const d = dictationDiff("Ils parlent.", "il parle");
    expect(d.exact).toBe(false);
    expect(d.chars.filter((c) => c.status === "miss").map((c) => c.ch).join("")).toBe("snt.");
  });
});
