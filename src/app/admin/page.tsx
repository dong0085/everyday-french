import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdmin, GLOBAL_PER_DAY, loadOverview, loadUsers, setupChecks, type Overview } from "@/lib/admin";
import { AdminUsers } from "@/components/AdminUsers";
import { bytes, money, when } from "@/lib/format";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

// Supabase Free plan limits (database size and file storage).
const FREE_DB_BYTES = 500 * 1024 ** 2;
const FREE_STORAGE_BYTES = 1024 ** 3;

const KIND_LABEL: Record<string, string> = { llm: "Text (topics)", tts: "Audio", stt: "Transcription", key_test: "Key tests" };

export default async function AdminPage() {
  const admin = await getAdmin();
  if (!admin) notFound();

  const [overview, users] = await Promise.all([loadOverview(), loadUsers()]);
  const checks = await setupChecks(overview.heartbeat?.at ?? null);
  const { users: u, topics: t } = overview;
  const storageBytes = Object.values(overview.storage).reduce((s, b) => s + b.bytes, 0);
  const finished = t.ready + t.failed;
  const cost30 = overview.usage30.reduce((s, r) => s + Number(r.costUsd ?? 0), 0);

  return (
    <main className="page admin">
      <header className="spread" style={{ margin: "16px 0 20px" }}>
        <div>
          <h1>Admin</h1>
          <p className="sub">The whole app at a glance. Topic content stays private: only counts and account details appear here.</p>
        </div>
        <Link href="/admin" className="btn btn-small" prefetch={false}>
          Refresh
        </Link>
      </header>

      <section aria-labelledby="setup">
        <h3 id="setup">Setup</h3>
        <ul className="checks">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? "ok" : c.optional ? "optional" : "bad"}>
              <span aria-hidden="true">{c.ok ? "✓" : c.optional ? "○" : "✕"}</span>
              <div>
                <strong>{c.label}</strong>
                <span className="meta"> · {c.detail}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="numbers">
        <h3 id="numbers">Numbers</h3>
        <div className="stats">
          <Stat label="Users" value={u.total} lines={[`+${u.new7} this week · +${u.new30} in 30 days`, `${u.active7} active this week`, u.banned ? `${u.banned} blocked` : null]} />
          <Stat
            label="Topics"
            value={t.total}
            lines={[
              `+${t.new7} this week`,
              finished ? `${pct(t.failed, finished)} failed (${t.failed})` : "none finished yet",
              t.generating ? `${t.generating} writing now${overview.stuck ? ` · ${overview.stuck} stuck` : ""}` : null,
            ]}
            warn={overview.stuck > 0}
          />
          <Stat label="Lines flagged by review" value={t.flaggedLines} lines={[t.lines ? `${pct(t.flaggedLines, t.lines)} of ${t.lines} lines` : "no lines yet"]} />
          <Stat label="Audio clips" value={overview.clips.count} lines={[bytes(overview.clips.bytes)]} />
          <Stat label="Saved for later" value={t.captures} lines={[`${t.capturesOpen} not made into topics yet`]} />
          <Stat label="Est. AI spend, 30 days" value={money(cost30)} lines={["Paid by users on their own keys"]} />
        </div>
      </section>

      <section aria-labelledby="free">
        <h3 id="free">Free plan room</h3>
        <div className="stack">
          <Meter label="Database" used={overview.dbBytes} max={FREE_DB_BYTES} />
          <Meter label="File storage (audio + memos)" used={storageBytes} max={FREE_STORAGE_BYTES} />
        </div>
        <p className="meta">
          Keep-awake: last run {overview.heartbeat ? `${when(overview.heartbeat.at)} (${overview.heartbeat.source ?? "unknown"})` : "never"}. Bandwidth is shown in the Supabase dashboard.
        </p>
      </section>

      <section aria-labelledby="days">
        <h3 id="days">Last 30 days</h3>
        <div className="charts">
          <Bars title="New topics" data={overview.daily.map((d) => ({ day: d.day, value: d.topics, part: d.failed }))} partLabel="failed" />
          <Bars title="New users" data={overview.daily.map((d) => ({ day: d.day, value: d.users }))} />
          <Bars title="Audio clips made" data={overview.daily.map((d) => ({ day: d.day, value: d.tts }))} />
        </div>
      </section>

      <section aria-labelledby="caps">
        <h3 id="caps">Daily safety limits (last 24 hours, whole app)</h3>
        <div className="stack">
          {(Object.keys(GLOBAL_PER_DAY) as (keyof typeof GLOBAL_PER_DAY)[]).map((k) => (
            <Meter key={k} label={KIND_LABEL[k] ?? k} used={overview.today[k] ?? 0} max={GLOBAL_PER_DAY[k]} count />
          ))}
        </div>
      </section>

      <section aria-labelledby="models">
        <h3 id="models">Topic models, 30 days</h3>
        <ModelsTable rows={overview.models30} />
      </section>

      <section aria-labelledby="usage">
        <h3 id="usage">Provider usage, 30 days</h3>
        <UsageTable rows={overview.usage30} />
      </section>

      <section aria-labelledby="failures">
        <h3 id="failures">Recent failures</h3>
        {overview.failures.length === 0 ? (
          <p className="empty">No failed topics or sections.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Model</th>
                  <th>Stage</th>
                  <th>Message shown</th>
                </tr>
              </thead>
              <tbody>
                {overview.failures.map((f, i) => (
                  <tr key={i}>
                    <td className="nowrap">{when(f.at)}</td>
                    <td>{f.email ?? "—"}</td>
                    <td>{f.model ?? "—"}</td>
                    <td>{f.stage}</td>
                    <td>{f.error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="users">
        <h3 id="users">Users ({users.length})</h3>
        <AdminUsers users={users} selfEmail={admin.email} />
      </section>
    </main>
  );
}

function pct(part: number, whole: number) {
  return whole ? `${Math.round((part / whole) * 100)}%` : "0%";
}

function Stat({ label, value, lines, warn }: { label: string; value: number | string; lines: (string | null)[]; warn?: boolean }) {
  return (
    <div className={`card stat${warn ? " warn" : ""}`}>
      <div className="meta">{label}</div>
      <div className="stat-value">{value}</div>
      {lines.filter(Boolean).map((l) => (
        <div key={l} className="meta">
          {l}
        </div>
      ))}
    </div>
  );
}

function Meter({ label, used, max, count }: { label: string; used: number; max: number; count?: boolean }) {
  const ratio = Math.min(1, used / max);
  const level = ratio > 0.9 ? "bad" : ratio > 0.7 ? "warn" : "ok";
  return (
    <div className="meter-row">
      <div className="spread small">
        <span>{label}</span>
        <span className="muted">
          {count ? `${used.toLocaleString("en")} / ${max.toLocaleString("en")}` : `${bytes(used)} / ${bytes(max)}`} · {pct(used, max)}
        </span>
      </div>
      <div className="meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={used}>
        <div className={`fill ${level}`} style={{ width: `${Math.max(ratio * 100, used ? 1 : 0)}%` }} />
      </div>
    </div>
  );
}

function Bars({ title, data, partLabel }: { title: string; data: { day: string; value: number; part?: number }[]; partLabel?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <figure className="card bars">
      <figcaption className="spread small">
        <strong>{title}</strong>
        <span className="muted">{total} total</span>
      </figcaption>
      <div className="bar-row" aria-hidden="true">
        {data.map((d) => (
          <div key={d.day} className="bar" title={`${d.day}: ${d.value}${d.part ? ` (${d.part} ${partLabel})` : ""}`}>
            <div className="bar-fill" style={{ height: `${(d.value / max) * 100}%` }}>
              {d.part ? <div className="bar-part" style={{ height: `${(d.part / d.value) * 100}%` }} /> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="spread meta">
        <span>{data[0]?.day.slice(5)}</span>
        <span>{data.at(-1)?.day.slice(5)}</span>
      </div>
    </figure>
  );
}

function ModelsTable({ rows }: { rows: Overview["models30"] }) {
  if (rows.length === 0) return <p className="empty">No topics in the last 30 days.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Model</th>
            <th className="num-col">Ready</th>
            <th className="num-col">Failed</th>
            <th className="num-col">Writing</th>
            <th className="num-col">Failure rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.model}>
              <td>{r.model}</td>
              <td className="num-col">{r.ready}</td>
              <td className="num-col">{r.failed}</td>
              <td className="num-col">{r.generating}</td>
              <td className={`num-col${r.failed / Math.max(1, r.ready + r.failed) > 0.2 ? " danger" : ""}`}>{pct(r.failed, r.ready + r.failed)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsageTable({ rows }: { rows: Overview["usage30"] }) {
  if (rows.length === 0) return <p className="empty">No provider calls in the last 30 days.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>What</th>
            <th>Provider / model</th>
            <th className="num-col">Calls</th>
            <th className="num-col">Amount</th>
            <th className="num-col">Est. cost</th>
            <th className="num-col">Users</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{KIND_LABEL[r.kind] ?? r.kind}</td>
              <td>{[r.provider, r.model].filter(Boolean).join(" / ") || "—"}</td>
              <td className="num-col">{r.calls.toLocaleString("en")}</td>
              <td className="num-col nowrap">{r.unitType ? `${Number(r.units).toLocaleString("en")} ${r.unitType}` : "—"}</td>
              <td className="num-col">{r.costUsd === null ? "—" : money(Number(r.costUsd))}</td>
              <td className="num-col">{r.users}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
