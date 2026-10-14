import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const region = process.env.NEXT_PUBLIC_DATA_REGION ?? "the United States";
  return (
    <main className="page prose">
      <h1>Privacy</h1>
      <p className="sub">Plain-language summary of what this app stores and where it goes.</p>

      <h2>What is stored</h2>
      <ul>
        <li>Your Google name and email address (from sign-in). The app asks Google only for your basic profile.</li>
        <li>What you write or record to make a topic, the topics themselves, saved notes and voice memos.</li>
        <li>Audio recordings made for your topics.</li>
        <li>Your API keys, encrypted (see below).</li>
        <li>A small usage log (what kind of request, which provider, size, time) used for rate limits and the &ldquo;This month&rdquo; numbers. It is deleted after 90 days.</li>
      </ul>
      <p>
        Data is stored with Supabase (database and files) in {region}, and the app runs on Vercel. Each account can only see its own data.
      </p>

      <h2>Your API keys</h2>
      <ul>
        <li>Keys are encrypted (AES-256-GCM) before they are saved. The encryption secret is kept separately from the database, so the database alone cannot reveal them.</li>
        <li>The server decrypts a key only to send a request you asked for (writing a topic, making audio, turning a memo into text) to the provider you chose.</li>
        <li>Keys are never shown again in full, never sent to your browser, and never written to logs.</li>
        <li>Honest note: the person who runs this app controls the server, so they could technically decrypt keys. Use a dedicated key with a monthly spending limit, and revoke it on the provider&apos;s website when you stop using the app.</li>
      </ul>

      <h2>What goes to AI providers</h2>
      <p>
        When you make a topic, your story text (and answers to follow-up questions) is sent to the AI provider you picked. When you make audio, the French lines are sent to your
        voice provider. When you transcribe a memo, the recording is sent to your speech-to-text provider. Each provider&apos;s own privacy terms apply — for example, Google&apos;s
        free tier may use prompts to improve its products.
      </p>

      <h2>Deleting your data</h2>
      <p>
        In <Link href="/settings">Settings</Link> you can download all your topics, remove any key, or delete your account. Deleting the account removes your topics, notes, memos,
        recordings, keys and usage log.
      </p>
      {contact && (
        <>
          <h2>Contact</h2>
          <p>
            Questions: <a href={`mailto:${contact}`}>{contact}</a>
          </p>
        </>
      )}
    </main>
  );
}
