"use client";
// Admin panel: the user list with search, sorting, and block / delete.
// A compact table from 768px; one-line rows that open on phones. 25 at a time.

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { AdminUser } from "@/lib/admin";
import { bytes, money, when } from "@/lib/format";
import { api, Sheet, Spinner, toast, toastError } from "./ui";
import { Icon } from "./Icon";

type Sort = "active" | "joined" | "topics" | "cost";

const SORTS: [Sort, string][] = [
  ["active", "Last active"],
  ["joined", "Newest"],
  ["topics", "Most topics"],
  ["cost", "Most spend"],
];
const PAGE = 25;

const time = (s: string | null) => (s ? new Date(s).getTime() : 0);

const WIDE = "(min-width: 768px)";
function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(WIDE);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

export function AdminUsers({ users, selfEmail }: { users: AdminUser[]; selfEmail: string }) {
  const router = useRouter();
  const wide = useWide();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("active");
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [confirm, setConfirm] = useState("");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = users.filter((u) => (!needle || `${u.email ?? ""} ${u.name ?? ""}`.toLowerCase().includes(needle)) && (!blockedOnly || u.blocked));
    const key: Record<Sort, (u: AdminUser) => number> = {
      active: (u) => time(u.lastActive),
      joined: (u) => time(u.createdAt),
      topics: (u) => u.topics,
      cost: (u) => u.cost30,
    };
    return list.sort((a, b) => key[sort](b) - key[sort](a));
  }, [users, q, sort, blockedOnly]);
  const page = shown.slice(0, limit);

  const act = async (u: AdminUser, action: "block" | "unblock" | "delete") => {
    setBusy(u.id);
    try {
      if (action === "delete") await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
      else await api(`/api/admin/users/${u.id}`, { method: "PATCH", json: { action } });
      toast(action === "delete" ? "Account deleted." : action === "block" ? "Blocked." : "Unblocked.");
      setDeleting(null);
      router.refresh();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(null);
    }
  };

  const actions = (u: AdminUser) => (
    <div className="row user-actions">
      <button type="button" className="btn btn-small" disabled={busy === u.id} onClick={() => act(u, u.blocked ? "unblock" : "block")}>
        {busy === u.id ? <Spinner /> : u.blocked ? "Unblock" : "Block"}
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
  );

  const badges = (u: AdminUser, self: boolean) => (
    <>
      {self && <span className="badge badge-accent">you</span>}
      {u.blocked && <span className="badge badge-warn">blocked</span>}
    </>
  );

  return (
    <div className="stack">
      <div className="row admin-filters">
        <input type="search" placeholder="Search email or name" aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Sort users" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
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

      {shown.length > 0 && wide && (
        <div className="table-wrap">
          <table className="table user-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Last active</th>
                <th className="num-col">Topics</th>
                <th className="num-col">Audio</th>
                <th>Keys</th>
                <th className="num-col">30 days</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {page.map((u) => {
                const self = u.email?.toLowerCase() === selfEmail;
                return (
                  <tr key={u.id} className={`user${u.blocked ? " blocked" : ""}`}>
                    <td>
                      <strong className="user-email">{u.email ?? "(no email)"}</strong> {badges(u, self)}
                      <div className="meta" suppressHydrationWarning>
                        {[u.name, u.level, `joined ${when(u.createdAt)}`, u.llmModel, `voice: ${u.ttsProvider ?? "device"}`, u.captures ? `${u.captures} notes` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </td>
                    <td className="nowrap" suppressHydrationWarning>
                      {when(u.lastActive)}
                    </td>
                    <td className="num-col">
                      {u.topics}
                      {u.failed ? <div className="danger small">{u.failed} failed</div> : null}
                    </td>
                    <td className="num-col nowrap">
                      {u.clips}
                      <div className="meta">{bytes(u.clipBytes)}</div>
                    </td>
                    <td>{u.keyProviders.length ? u.keyProviders.join(", ") : <span className="muted">none</span>}</td>
                    <td className="num-col nowrap">
                      {money(u.cost30)}
                      <div className="meta">{u.calls30} calls</div>
                    </td>
                    <td>{!self && actions(u)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {shown.length > 0 && !wide && (
        <ul className="user-list">
          {page.map((u) => {
            const self = u.email?.toLowerCase() === selfEmail;
            const isOpen = open === u.id;
            return (
              <li key={u.id} className={`user${u.blocked ? " blocked" : ""}${isOpen ? " open" : ""}`}>
                <button type="button" className="user-line" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : u.id)}>
                  <span className="grow user-line-text">
                    <strong className="ellipsis">{u.email ?? "(no email)"}</strong>
                    <span className="meta" suppressHydrationWarning>
                      {when(u.lastActive)} · {u.topics} topics{u.failed ? ` (${u.failed} failed)` : ""} · {money(u.cost30)}
                    </span>
                  </span>
                  {badges(u, self)}
                  <Icon name={isOpen ? "chevron-down" : "chevron-right"} size={18} />
                </button>
                {isOpen && (
                  <div className="user-more">
                    <dl className="user-facts">
                      <Fact label="Name">{u.name ?? "—"}</Fact>
                      <Fact label="Signed in with">{u.provider}</Fact>
                      <Fact label="Level">{u.level ?? "—"}</Fact>
                      <Fact label="Joined">{when(u.createdAt)}</Fact>
                      <Fact label="Audio">
                        {u.clips} · {bytes(u.clipBytes)}
                      </Fact>
                      <Fact label="Saved notes">{u.captures}</Fact>
                      <Fact label="Keys">{u.keyProviders.length ? u.keyProviders.join(", ") : "none"}</Fact>
                      <Fact label="Topic model">{u.llmModel ?? "—"}</Fact>
                      <Fact label="Voice">{u.ttsProvider ?? "device"}</Fact>
                      <Fact label="30 days">
                        {u.calls30} calls · {money(u.cost30)}
                      </Fact>
                    </dl>
                    {!self && actions(u)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {shown.length > limit && (
        <button type="button" className="btn self-start" onClick={() => setLimit((l) => l + PAGE)}>
          Show more ({shown.length - limit} left)
        </button>
      )}

      <Sheet open={deleting !== null} onClose={() => setDeleting(null)} title="Delete this account?">
        {deleting && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void act(deleting, "delete");
            }}
          >
            <p className="m-0">
              This removes <strong>{deleting.email}</strong> and all of their topics, recordings, notes, review cards and keys. It can&apos;t be undone. They can sign in again later
              as a new, empty account; use Block to stop that.
            </p>
            <label className="field">
              <span>Type the email to confirm</span>
              <input type="text" autoComplete="off" autoCapitalize="off" spellCheck={false} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            <button
              type="submit"
              className="btn btn-danger-fill"
              disabled={confirm.trim().toLowerCase() !== (deleting.email ?? "").toLowerCase() || busy === deleting.id}
            >
              {busy === deleting.id ? <Spinner /> : "Delete account"}
            </button>
          </form>
        )}
      </Sheet>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd suppressHydrationWarning>{children}</dd>
    </div>
  );
}
