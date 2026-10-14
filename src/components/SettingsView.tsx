"use client";
// Settings: Learning · Listening · AI services · This month · Appearance · Account · Danger zone.
// Profile changes save at once (optimistic, rolled back on error) with a small "Saved ✓" next to the control.

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Use } from "@/lib/providers/catalog";
import { api, confirmDialog, toastError } from "./ui";
import { SetupAI } from "./SetupAI";
import { connectedFor, providerName, USE_FIELD, usesKey, type Key, type Patch, type Profile, type Usage } from "./settings/shared";
import { provider as providerInfo } from "@/lib/providers/catalog";
import { LearningGroup } from "./settings/Learning";
import { ListeningGroup } from "./settings/Listening";
import { ServicesGroup } from "./settings/Services";
import { UsageGroup } from "./settings/Usage";
import { AppearanceGroup } from "./settings/Appearance";
import { AccountGroup, DangerZone } from "./settings/Account";
import { Picker } from "./settings/Picker";

export type SettingsProps = {
  profile: Profile;
  keys: Key[];
  usage: Usage;
  allowMock: boolean;
  isAdmin: boolean;
};

const JUMPS: [string, string][] = [
  ["learning", "Learning"],
  ["listening", "Listening"],
  ["ai", "AI services"],
  ["usage", "This month"],
  ["appearance", "Appearance"],
  ["account", "Account"],
];

export function SettingsView({ profile, keys: initialKeys, usage, allowMock, isAdmin }: SettingsProps) {
  const router = useRouter();
  const [p, setP] = useState(profile);
  const [keys, setKeys] = useState(initialKeys);
  // After router.refresh() the server sends fresh props: take them (the server is the truth).
  const [seen, setSeen] = useState({ profile, initialKeys });
  if (seen.profile !== profile || seen.initialKeys !== initialKeys) {
    setSeen({ profile, initialKeys });
    setP(profile);
    setKeys(initialKeys);
  }
  const [setup, setSetup] = useState<{ use: Use; choose: boolean } | null>(null);
  const [picker, setPicker] = useState<Use | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const patch: Patch = async (body, local, field) => {
    const before = p;
    setP((x) => ({ ...x, ...local }));
    try {
      await api("/api/profile", { method: "PATCH", json: body });
      setSaved(field);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(null), 1800);
    } catch (e) {
      setP(before);
      toastError(e);
      throw e;
    }
  };
  const quietPatch: Patch = (body, local, field) => patch(body, local, field).catch(() => {});

  const current = (use: Use) => p[USE_FIELD[use]];
  const connected = (use: Use) => connectedFor(use, keys, current(use), allowMock);

  const removeKey = async (k: Key) => {
    const name = providerName(k.provider);
    const site = providerInfo(k.provider)?.keySite ?? `${name}'s website`;
    const consequences: string[] = [];
    if (usesKey(p.llm, k)) consequences.push("New topics can't be written until you connect another AI service.");
    if (usesKey(p.tts, k)) consequences.push("New lines play with your device voice. Recordings you already have stay.");
    if (usesKey(p.stt, k)) consequences.push("Voice memos stop being turned into text. You can still type or use your keyboard's dictation.");
    if (!consequences.length) consequences.push("Nothing stops working: this key is not used right now.");
    consequences.push(`If you no longer use it, also delete it in ${site}.`);
    const ok = await confirmDialog({
      title: `Remove the ${name} key?`,
      body: `••••${k.last4}`,
      consequences,
      confirmLabel: "Remove key",
      danger: true,
    });
    if (!ok) return;
    try {
      const r = await api<{ keys: Key[] }>(`/api/keys/${k.id}`, { method: "DELETE" });
      setKeys(r.keys);
      router.refresh();
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <main className="page settings">
      <h1>Settings</h1>
      {p.email && <p className="sub">Signed in as {p.email}</p>}

      <nav className="chips settings-jump" aria-label="Settings sections">
        {JUMPS.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>

      <LearningGroup p={p} patch={quietPatch} saved={saved} />
      <ListeningGroup p={p} onChangeVoice={() => setPicker("speech")} />
      <ServicesGroup
        p={p}
        keys={keys}
        canChange={(use) => connected(use).length > 0}
        onConnect={(use) => setSetup(use ? { use, choose: false } : { use: !p.llm ? "text" : !p.tts ? "speech" : !p.stt ? "transcribe" : "text", choose: true })}
        onChange={(use) => setPicker(use)}
        onRemove={removeKey}
        saved={saved}
      />
      <UsageGroup usage={usage} />
      <AppearanceGroup />
      <AccountGroup email={p.email} isAdmin={isAdmin} />
      <DangerZone />

      <SetupAI
        open={setup !== null}
        use={setup?.use ?? "text"}
        chooseUse={setup?.choose}
        from="settings"
        allowMock={allowMock}
        onClose={() => setSetup(null)}
        onDone={() => {
          setSetup(null);
          router.refresh();
        }}
      />
      {picker && (
        <Picker
          use={picker}
          current={current(picker)}
          options={connected(picker)}
          keys={keys}
          onClose={() => setPicker(null)}
          onConnectOther={() => {
            const use = picker;
            setPicker(null);
            setSetup({ use, choose: false });
          }}
          onSave={async (conn) => {
            const field = USE_FIELD[picker];
            try {
              await patch({ [field]: conn }, { [field]: conn } as Partial<Profile>, field);
              setPicker(null);
              return true;
            } catch {
              return false;
            }
          }}
        />
      )}
    </main>
  );
}
