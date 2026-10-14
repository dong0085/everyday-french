// Top of the home page: what to review today, and one line to say next time.
import Link from "next/link";
import type { TopicSummary } from "@/lib/data";
import { Fr, PlayButton } from "../ui";
import { Icon } from "../Icon";

export function TodayCard({ due, next }: { due: number; next: TopicSummary | null }) {
  const line = next?.nextTime;
  return (
    <section className="today card" aria-label="Today">
      {due > 0 ? (
        <Link href="/review" className="today-review">
          <span className="today-icon" aria-hidden="true">
            <Icon name="cards" size={22} />
          </span>
          <span className="grow">
            <strong>
              {due} to review today
            </strong>
            <span className="hint">A few minutes. Words come back when you need them.</span>
          </span>
          <Icon name="arrow-right" size={20} />
        </Link>
      ) : (
        <p className="today-done">
          <span className="today-icon" aria-hidden="true">
            <Icon name="check" size={20} />
          </span>
          <span>
            Nothing to review today. <span lang="fr">À demain !</span> <span className="muted">(See you tomorrow.)</span>
          </span>
        </p>
      )}
      {line && next && (
        <div className="today-next">
          <p className="eyebrow m-0">Next time, say…</p>
          <div className="today-line">
            <PlayButton text={line.fr} />
            <div className="grow">
              <div className="fr" lang="fr">
                <Fr text={line.fr} />
              </div>
              <div className="en">{line.en}</div>
              <Link className="small" href={`/topics/${next.id}`}>
                From <Fr text={next.titleFr || next.title} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
