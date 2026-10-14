import type { Metadata } from "next";
import Link from "next/link";
import { PROVIDERS } from "@/lib/providers/catalog";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Privacy" };

const UPDATED = "15 October 2026";

export default function Privacy() {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const region = process.env.NEXT_PUBLIC_DATA_REGION ?? "the United States";
  const withPolicy = PROVIDERS.filter((p) => p.privacyUrl);
  return (
    <main className="page prose privacy">
      <h1>Privacy</h1>
      <p className="sub">What this app stores, and where it goes. Last updated {UPDATED}.</p>

      <section className="card privacy-short" aria-labelledby="short">
        <h2 id="short" className="eyebrow">
          In short
        </h2>
        <ul>
          <li>Your stories go only to the AI service you choose, and only when you ask for a topic.</li>
          <li>Your AI keys are encrypted and never sent back to your browser.</li>
          <li>You can download everything or delete your account at any time.</li>
        </ul>
      </section>

      <nav className="chips privacy-toc" aria-label="On this page">
        <a href="#stored">What is stored</a>
        <a href="#admin">What the admin sees</a>
        <a href="#keys">Your keys</a>
        <a href="#providers">AI services</a>
        <a href="#delete">Deleting</a>
        <a href="#contact">Contact</a>
      </nav>

      <h2 id="stored">What is stored</h2>
      <ul>
        <li>Your Google name and email address (from sign-in). The app asks Google only for your basic profile.</li>
        <li>What you write or record to make a topic, the topics themselves, saved notes and voice memos.</li>
        <li>Your learning data: the review schedule (which cards are due and when), the sentences you practise and save in “Your turn”, and your settings.</li>
        <li>Audio recordings made for your topics.</li>
        <li>Your API keys, encrypted (see below).</li>
        <li>A small usage log (what kind of request, which provider, size, time) used for rate limits and the “This month” numbers. It is deleted after 90 days.</li>
      </ul>
      <p>
        Data is stored with Supabase (database and files) in {region}, and the app runs on Vercel. Each account can only see its own data. Your practice sentences and review
        schedule are private, like your topics.
      </p>
      <p>Some small choices (device voice, speed, light or dark colours) are saved only in your browser.</p>

      <h2 id="admin">What the person who runs the app sees</h2>
      <p>
        An admin page shows account details and counts, to keep the service running: your email and name, when you joined and last signed in, how many topics, recordings and
        notes you have, which providers you connected (never the keys), the usage log, and the error message when a topic fails. It does not show your topics, stories, notes,
        practice sentences, review cards or recordings.
      </p>

      <h2 id="keys">Your API keys</h2>
      <ul>
        <li>Keys are encrypted (AES-256-GCM) before they are saved. The encryption secret is kept separately from the database, so the database alone cannot reveal them.</li>
        <li>The server decrypts a key only to send a request you asked for (writing a topic, making audio, turning a memo into text) to the provider you chose.</li>
        <li>Keys are never shown again in full, never sent to your browser, and never written to logs.</li>
        <li>
          Honest note: the person who runs this app controls the server, so they could technically decrypt keys. Use a dedicated key with a monthly spending limit, and revoke it
          on the provider&apos;s website when you stop using the app.
        </li>
      </ul>

      <h2 id="providers">What goes to AI services</h2>
      <p>
        When you make a topic, your story text (and answers to follow-up questions) is sent to the AI service you picked. When you check a practice sentence, that sentence is sent
        too. When you make audio, the French lines are sent to your voice service. When you transcribe a memo, the recording is sent to your speech-to-text service.
      </p>
      <p>
        Each service&apos;s own privacy terms apply. For example, on Google&apos;s free tier Google may use prompts to improve its products; paid plans of most services do not
        use your data for training.
      </p>
      <ul className="privacy-links">
        {withPolicy.map((p) => (
          <li key={p.id}>
            <a href={p.privacyUrl} target="_blank" rel="noopener noreferrer">
              {p.name}
              <Icon name="external" size={14} />
              <span className="visually-hidden"> privacy terms (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>

      <h2 id="delete">Deleting your data</h2>
      <p>
        In <Link href="/settings">Settings</Link> you can download all your topics, remove any key, or delete your account. Deleting the account removes your topics, notes, memos,
        practice sentences, review cards, recordings, keys and usage log.
      </p>

      <h2 id="contact">Contact</h2>
      {contact ? (
        <p>
          Questions: <a href={`mailto:${contact}`}>{contact}</a>
        </p>
      ) : (
        <p>Questions: contact the person who runs this app.</p>
      )}
    </main>
  );
}
