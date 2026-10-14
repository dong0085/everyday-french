"use client";
// "How this topic was made": what the learner wrote, their answers, the AI's summary, the full prompt.

import type { FullTopic } from "@/lib/data";
import { toast } from "../ui";
import { Icon } from "../Icon";

export function PromptBox({ topic }: { topic: FullTopic }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(topic.prompt ?? "");
      toast("Prompt copied.");
    } catch {
      toast("Could not copy. Select the text instead.");
    }
  };
  return (
    <details className="story-box">
      <summary>
        <Icon name="chevron-right" size={16} className="chev" />
        How this topic was made
      </summary>
      <h3 className="label">What you wrote</h3>
      <p className="source">{topic.sourceText || topic.story}</p>
      {topic.answers.length > 0 && (
        <>
          <h3 className="label">Your answers</h3>
          <dl className="prompt-answers">
            {topic.answers.map((a, i) => (
              <div key={i}>
                <dt>{a.question}</dt>
                <dd>{a.answer}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {topic.story && topic.story !== topic.sourceText && (
        <>
          <h3 className="label">The AI&apos;s summary</h3>
          <p>{topic.story}</p>
        </>
      )}
      {topic.prompt && (
        <details className="prompt-full">
          <summary>
            <Icon name="chevron-right" size={16} className="chev" />
            Full prompt sent to the AI
          </summary>
          <p className="hint">
            The rules and your story, as the AI got them in the first step (planning the sections). The next steps send the plan back and ask for each section, My
            story, the dialogue and the review. Rebuilt from your saved story and settings.
          </p>
          <button type="button" className="btn btn-small" onClick={copy}>
            <Icon name="clipboard" size={16} /> Copy prompt
          </button>
          <pre>{topic.prompt}</pre>
        </details>
      )}
    </details>
  );
}
