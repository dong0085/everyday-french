import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/supabase/server";
import { getProfile, getTopic } from "@/lib/data";
import { TopicView } from "@/components/topic/TopicView";

export async function generateMetadata(props: PageProps<"/topics/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const t = await getTopic(id).catch(() => null);
  return { title: t?.titleFr || "Topic" };
}

export default async function TopicPage(props: PageProps<"/topics/[id]">) {
  const userId = await getUserId();
  if (!userId) redirect("/");
  const { id } = await props.params;
  const sp = await props.searchParams;
  const [topic, profile] = await Promise.all([getTopic(id), getProfile(userId)]);
  if (!topic) notFound();
  return <TopicView initial={topic} initialStale={topic.stale} welcome={sp.welcome === "1"} hasLlm={Boolean(profile.llm)} />;
}
