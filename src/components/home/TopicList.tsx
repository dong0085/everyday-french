// The learner's topics on the home page: own topics (by month once there are many), then the example.
import Link from "next/link";
import type { TopicSummary } from "@/lib/data";
import { Fr, Spinner } from "../ui";
import { Icon } from "../Icon";
import { RelDate } from "./RelDate";

export function TopicList({ topics }: { topics: TopicSummary[] }) {
  const own = topics.filter((t) => !t.isExample);
  const examples = topics.filter((t) => t.isExample);
  const groups = own.length > 8 ? byMonth(own) : [{ label: null, items: own }];
  return (
    <>
      {own.length > 0 &&
        groups.map((g) => (
          <section key={g.label ?? "all"} aria-label={g.label ?? "My topics"}>
            {g.label && <h3>{g.label}</h3>}
            <ul className="topics" id={g.label ? undefined : "topic-list"}>
              {g.items.map((t) => (
                <li key={t.id}>
                  <TopicCard t={t} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      {examples.length > 0 && (
        <section aria-labelledby="example-h">
          <h3 id="example-h">Example</h3>
          <ul className="topics">
            {examples.map((t) => (
              <li key={t.id}>
                <TopicCard t={t} slim={own.length > 0} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function TopicCard({ t, slim }: { t: TopicSummary; slim?: boolean }) {
  const writing = t.status === "generating";
  return (
    <Link className={`topic-card${slim ? " slim" : ""}`} href={`/topics/${t.id}`}>
      <span className="t-fr" lang="fr">
        {t.titleFr ? <Fr text={t.titleFr} /> : "On écrit ton sujet…"}
      </span>
      <span className="t-en">{t.title || "Writing your topic"}</span>
      <span className="t-meta">
        <RelDate iso={t.createdAt} />
        {t.status === "ready" && (
          <>
            <span aria-hidden="true">·</span>
            <span>
              {t.words} {t.words === 1 ? "word" : "words"} · {t.sentences} {t.sentences === 1 ? "sentence" : "sentences"}
            </span>
          </>
        )}
        {writing && (
          <span className="badge badge-accent">
            <Spinner /> Writing…
          </span>
        )}
        {t.status === "failed" && <span className="badge badge-warn">Needs attention</span>}
        {t.status === "ready" && t.studiedAt && (
          <span className="badge badge-ok">
            <Icon name="check" size={12} /> Studied
          </span>
        )}
        {t.status === "ready" && t.lines > 0 && t.recorded >= t.lines && (
          <span className="badge">
            <Icon name="speaker" size={12} /> Natural audio
          </span>
        )}
      </span>
      <Icon name="chevron-right" size={20} className="t-chev" />
    </Link>
  );
}

function byMonth(items: TopicSummary[]) {
  const out: { label: string; items: TopicSummary[] }[] = [];
  for (const t of items) {
    const label = new Date(t.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
    const last = out[out.length - 1];
    if (last?.label === label) last.items.push(t);
    else out.push({ label, items: [t] });
  }
  return out;
}
