import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getUserId } from "@/lib/supabase/server";
import { clipsFor } from "@/lib/audio/clips";
import { connections } from "@/lib/conn";
import { backfillReviewItems, loadDueDeck, loadPracticeDeck, todayIn } from "@/lib/review";
import { ReviewDeck, ReviewEmpty } from "@/components/ReviewDeck";
import type { Card } from "@/components/review/cards";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ practice?: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/");
  const practice = (await searchParams).practice === "1";
  const tz = (await cookies()).get("ef.tz")?.value;
  const today = todayIn(tz ? decodeURIComponent(tz) : null);

  let cards: Card[];
  let dueTotal = 0;
  let tomorrow = 0;
  if (practice) cards = await loadPracticeDeck(userId);
  else {
    await backfillReviewItems(userId);
    const deck = await loadDueDeck(userId, today);
    if (!deck.cards.length) return <ReviewEmpty hasItems={deck.hasItems} tomorrow={deck.tomorrow} today={today} />;
    ({ cards, dueTotal, tomorrow } = deck);
  }

  const { tts } = await connections(userId);
  const texts = cards.flatMap((c) => (c.example ? [c.fr, c.example.fr] : [c.fr]));
  const clips = await clipsFor(userId, texts, tts);
  // A new key each render: "New shuffle" / "Keep going" (router.refresh) start a fresh deck.
  return <ReviewDeck key={randomUUID()} cards={cards} clips={clips} practice={practice} dueTotal={dueTotal} tomorrow={tomorrow} today={today} />;
}
