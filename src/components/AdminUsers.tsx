"use client";
// Admin panel: the user list with search, sorting, and block / delete.

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AdminUser } from "@/lib/admin";
import { bytes, money, when } from "@/lib/format";
import { api, Sheet, Spinner, toast } from "./ui";

type Sort = "active" | "joined" | "topics" | "cost";

const SORTS: [Sort, string][] = [
  ["active", "Last active"],
  ["joined", "Newest"],
  ["topics", "Most topics"],
  ["cost", "Most spend"],
];

const time = (s: string | null) => (s ? new Date(s).getTime() : 0);

export function AdminUsers({ users, selfEmail }: { users: AdminUser[]; selfEmail: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("active");
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [confirm, setConfirm] = useState("");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = users.filter(
      (u) => (!needle || `${u.email ?? ""} ${u.name ?? ""}`.toLowerCase().includes(needle)) && (!blockedOnly || u.blocked),
    );
    const key: Record<Sort, (u: AdminUser) => number> = {
      active: (u) => time(u.lastActive),
      joined: (u) => time(u.createdAt),
      topics: (u) => u.topics,
      cost: (u) => u.cost30,
    };
    return list.sort((a, b) => key[sort](b) - key[sort](a));
  }, [users, q, sort, blockedOnly]);

  const act = async (u: AdminUser, action: "block" | "unblock" | "delete") => {
    setBusy(u.id);
    try {
      if (action === "delete") await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
      else await api(`/api/admin/users/${u.id}`, { method: "PATCH", json: { action } });
      toast(action === "delete" ? "Account deleted." : action === "block" ? "Blocked." : "Unblocked.");
      setDeleting(null);
      router.refresh();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="stack">
      <div className="row">
        <input type="search" placeholder="Search email or name" aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 220px" }} />
        <select aria-label="Sort users" value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={{ width: "auto" }}>
          {SORTS.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <button type="button" className="toggle" aria-pressed={blockedOnly} onClick={() => setBlockedOnly((b) => !b)}>
          Blocked only
        </button>
      </div>

      {shown.length === 0 && <p className="empty">No users match.</p>}

      <ul className="user-list">
        {shown.map((u) => {
          const self = u.email?.toLowerCase() === selfEmail;
          const isBlocked = u.blocked;
          return (
            <li key={u.id} className={`card user${isBlocked ? " blocked" : ""}`}>
              <div className="spread">
                <div style={{ minWidth: 0 }}>
                  <strong className="ellipsis">{u.email ?? "(no email)"}</strong>
                  <div className="meta">
                    {u.name ?? "—"} · {u.provider}
                    {u.level ? ` · ${u.level}` : ""}
                    {self && <span className="badge badge-accent">you</span>}
                    {isBlocked && <span className="badge badge-warn">blocked</span>}
                  </div>
                </div>
                {!self && (
                  <div className="row">
                    <button type="button" className="btn btn-small" disabled={busy === u.id} onClick={() => act(u, isBlocked ? "unblock" : "block")}>
                      {busy === u.id ? <Spinner /> : isBlocked ? "Unblock" : "Block"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-danger"
                      disabled={busy === u.id}
                      onClick={() => {
                        setConfirm("");
                        setDeleting(u);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <dl className="user-facts">
                <div>
                  <dt>Joined</dt>
                  <dd suppressHydrationWarning>{when(u.createdAt)}</dd>
                </div>
                <div>
                  <dt>Last active</dt>
                  <dd suppressHydrationWarning>{when(u.lastActive)}</dd>
                </div>
                <div>
                  <dt>Topics</dt>
                  <dd>
                    {u.topics}
                    {u.failed ? <span className="danger"> ({u.failed} failed)</span> : null}
                  </dd>
                </div>
                <div>
                  <dt>Audio</dt>
                  <dd>
                    {u.clips} · {bytes(u.clipBytes)}
                  </dd>
                </div>
                <div>
                  <dt>Saved notes</dt>
                  <dd>{u.captures}</dd>
                </div>
                <div>
                  <dt>Keys</dt>
                  <dd>{u.keyProviders.length ? u.keyProviders.join(", ") : "none"}</dd>
                </div>
                <div>
                  <dt>Topic model</dt>
                  <dd>{u.llmModel ?? "—"}</dd>
                </div>
                <div>
                  <dt>Voice</dt>
                  <dd>{u.ttsProvider ?? "device"}</dd>
                </div>
                <div>
                  <dt>30 days</dt>
                  <dd>
                    {u.calls30} calls · {money(u.cost30)}
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>

      <Sheet open={deleting !== null} onClose={() => setDeleting(null)} title="Delete this account?">
        {deleting && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void act(deleting, "delete");
            }}
          >
            <p style={{ margin: 0 }}>
              This removes <strong>{deleting.email}</strong> and all of their topics, recordings, notes and keys. It can&apos;t be undone. They can sign in again later as a new, empty
              account; use Block to stop that.
            </p>
            <label className="field">
              <span>Type the email to confirm</span>
              <input type="text" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            <button type="submit" className="btn btn-danger" disabled={confirm.trim().toLowerCase() !== (deleting.email ?? "").toLowerCase() || busy === deleting.id}>
              {busy === deleting.id ? <Spinner /> : "Delete account"}
            </button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
