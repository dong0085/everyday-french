import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";
import { getProfile, getTopic } from "@/lib/data";
import { TopicView } from "@/components/topic/TopicView";

export async function generateMetadata(props: PageProps<"/topics/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const t = await getTopic(id).catch(() => null);
  return { title: t?.titleFr || "Topic" };
}

/** Extra words the learner starred for Review in this topic (as the user, RLS applies). */
async function starredLines(topicId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("review_items").select("line_id").eq("topic_id", topicId).eq("starred", true);
  return (data ?? []).map((r) => r.line_id);
}

export default async function TopicPage(props: PageProps<"/topics/[id]">) {
  const userId = await getUserId();
  if (!userId) redirect("/");
  const { id } = await props.params;
  const sp = await props.searchParams;
  const [topic, profile, starred] = await Promise.all([getTopic(id), getProfile(userId), starredLines(id).catch(() => [])]);
  if (!topic) notFound();
  return <TopicView initial={topic} initialStale={topic.stale} welcome={sp.welcome === "1"} hasLlm={Boolean(profile.llm)} starred={starred} />;
}
