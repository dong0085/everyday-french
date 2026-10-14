import { getUserId } from "@/lib/supabase/server";
import { countDueReviews, getProfile, isDbUnavailable, listCaptures, listTopics } from "@/lib/data";
import { mockAllowed } from "@/lib/providers/mock";
import { Landing } from "@/components/Landing";
import { Unavailable } from "@/components/Unavailable";
import { HomeLibrary } from "@/components/HomeSearch";
import { CaptureList } from "@/components/CaptureList";
import { Fr } from "@/components/ui";
import { TopicList } from "@/components/home/TopicList";
import { TodayCard } from "@/components/home/TodayCard";
import { FirstRun } from "@/components/home/FirstRun";
import { RefreshWhileWriting } from "@/components/home/RefreshWhileWriting";

async function loadHome(userId: string) {
  const [topics, captures, profile, due] = await Promise.all([
    listTopics(),
    listCaptures(),
    getProfile(userId),
    // Review is a convenience: if only this count fails, the home page still works.
    countDueReviews().catch((e) => {
      if (isDbUnavailable(e)) throw e;
      return 0;
    }),
  ]);
  return { topics, captures, profile, due };
}

export default async function Home(props: PageProps<"/">) {
  const userId = await getUserId();
  const sp = await props.searchParams;
  if (!userId) return <Landing error={typeof sp.error === "string" ? sp.error : null} devLogin={mockAllowed()} />;

  const data = await loadHome(userId).catch((e) => {
    if (isDbUnavailable(e)) return null;
    throw e;
  });
  if (!data) return <Unavailable />;

  const { topics, captures, profile, due } = data;
  const own = topics.filter((t) => !t.isExample);
  const firstName = profile.display_name?.trim().split(/\s+/)[0] ?? "";
  const next = own.find((t) => t.status === "ready" && t.nextTime) ?? null;

  return (
    <main className="page home">
      <header className="home-head">
        <h1 lang="fr">
          <Fr text={firstName ? `Bonjour, ${firstName} !` : "Bonjour !"} />
        </h1>
        <p className="sub">
          <span lang="fr">Mes sujets</span> · French from things that happened to you.
        </p>
      </header>

      {(own.length > 0 || due > 0) && <TodayCard due={due} next={next} />}
      {own.length === 0 && <FirstRun />}

      <RefreshWhileWriting active={topics.some((t) => t.status === "generating")} />

      <HomeLibrary searchable={topics.length > 1}>
        {captures.length > 0 && (
          <CaptureList captures={captures.map((c) => ({ id: c.id, text: c.text, hasAudio: Boolean(c.audio_path), createdAt: c.created_at }))} />
        )}
        <TopicList topics={topics} />
      </HomeLibrary>
    </main>
  );
}
