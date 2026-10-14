"use client";

import { count, duration, money, tokens } from "@/lib/format";
import { Group, type Usage } from "./shared";

export function UsageGroup({ usage }: { usage: Usage }) {
  return (
    <Group id="usage" title="This month">
      <div className="usage-total">
        <span className="usage-money">≈ {money(usage.costUsd)}</span>
        <span className="muted small">estimated cost so far, paid to your AI services</span>
      </div>
      <dl className="usage-rows">
        <div>
          <dt>Topics made</dt>
          <dd>{count(usage.topics)}</dd>
        </div>
        <div>
          <dt>Lines recorded</dt>
          <dd>
            {count(usage.ttsClips)}
            {usage.ttsChars > 0 && <span className="muted"> · {count(usage.ttsChars)} characters</span>}
          </dd>
        </div>
        <div>
          <dt>Voice memos</dt>
          <dd>{usage.sttSeconds > 0 ? duration(usage.sttSeconds) : "none"}</dd>
        </div>
        <div>
          <dt>AI requests</dt>
          <dd>
            {count(usage.llmCalls)}
            {usage.topicsTokens > 0 && <span className="muted"> · {tokens(usage.topicsTokens)} tokens</span>}
          </dd>
        </div>
      </dl>
      <p className="hint m-0">Estimates. Your AI service&apos;s own website shows the real amounts.</p>
    </Group>
  );
}
