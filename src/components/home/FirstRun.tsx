// Home before the learner has a topic of their own: tappable ideas that open /new pre-filled.
import Link from "next/link";
import { IDEAS, IDEA_KEYS } from "./ideas";
import { Icon } from "../Icon";

export function FirstRun() {
  return (
    <section className="card first-run" aria-labelledby="first-h">
      <h2 id="first-h">Make your first topic</h2>
      <p className="muted m-0">
        Tell it about something that happened to you, in any language. A few sentences are enough.{" "}
        <span lang="zh-Hans" className="zh-inline">
          可以用中文写。
        </span>
      </p>
      <ul className="ideas" aria-label="Ideas">
        {IDEA_KEYS.slice(0, 3).map((k) => (
          <li key={k}>
            <Link className="idea-card" href={`/new?idea=${k}`}>
              <strong>{IDEAS[k].label}</strong>
              <span>“{IDEAS[k].story}”</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/new" className="btn btn-primary btn-large self-start">
        <Icon name="pen" size={20} /> What happened?
      </Link>
    </section>
  );
}
