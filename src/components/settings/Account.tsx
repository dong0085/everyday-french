"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, confirmDialog, Spinner, toastError } from "../ui";
import { Icon } from "../Icon";
import { Group } from "./shared";

export function AccountGroup({ email, isAdmin }: { email: string | null; isAdmin: boolean }) {
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);

  return (
    <Group id="account" title="Account">
      <div className="list-row">
        <div className="grow">
          <div className="label">Signed in</div>
          <div className="small ellipsis">{email ?? "with Google"}</div>
        </div>
        <form action="/auth/signout" method="post">
          <button className="btn btn-small" type="submit">
            Sign out
          </button>
        </form>
      </div>

      <a className="list-row link-row" href="/api/export" download>
        <span className="grow">
          <span className="label">Download my topics</span>
          <span className="small muted block">A JSON file with every topic, to keep or import later.</span>
        </span>
        <Icon name="arrow-right" size={18} />
      </a>

      <label className={`list-row link-row${importing ? " busy" : ""}`} aria-busy={importing || undefined}>
        <span className="grow">
          <span className="label">Import topics</span>
          <span className="small muted block" aria-live="polite">
            {importing ? "Importing…" : imported !== null ? `Imported ${imported} topic${imported === 1 ? "" : "s"}. They are on Home.` : "From a file you downloaded here."}
          </span>
        </span>
        {importing ? <Spinner /> : <Icon name="arrow-right" size={18} />}
        <input
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          disabled={importing}
          onChange={async (e) => {
            const input = e.currentTarget;
            const f = input.files?.[0];
            if (!f) return;
            setImporting(true);
            setImported(null);
            try {
              const r = await api<{ imported: number }>("/api/import", { json: JSON.parse(await f.text()) });
              setImported(r.imported);
            } catch (err) {
              toastError(err instanceof SyntaxError ? new Error("That file is not valid JSON.") : err);
            } finally {
              setImporting(false);
              input.value = ""; // so the same file can be chosen again
            }
          }}
        />
      </label>

      <Link className="list-row link-row" href="/privacy">
        <span className="grow label">Privacy</span>
        <Icon name="chevron-right" size={18} />
      </Link>

      {isAdmin && (
        <Link className="list-row link-row" href="/admin" prefetch={false}>
          <span className="grow label">Admin panel</span>
          <Icon name="chevron-right" size={18} />
        </Link>
      )}
    </Group>
  );
}

export function DangerZone() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Group id="danger" title="Danger zone" className="danger-zone">
      <div className="setting">
        <p className="small m-0">Deleting your account cannot be undone. Download your topics first if you want to keep them.</p>
        <button
          type="button"
          className="btn btn-danger self-start"
          disabled={busy}
          onClick={async () => {
            const ok = await confirmDialog({
              title: "Delete your account?",
              body: "This deletes everything, for good:",
              consequences: [
                "Your topics, stories, notes and practice sentences",
                "Your review cards and their schedule",
                "Recordings and voice memos",
                "Your saved AI keys (also revoke them on each service's website)",
              ],
              confirmLabel: "Delete my account",
              danger: true,
              typed: "DELETE",
            });
            if (!ok) return;
            setBusy(true);
            try {
              await api("/api/account", { method: "DELETE" });
              router.push("/");
              router.refresh();
            } catch (err) {
              toastError(err);
              setBusy(false);
            }
          }}
        >
          {busy ? <Spinner /> : <Icon name="trash" size={18} />} Delete my account
        </button>
      </div>
    </Group>
  );
}
