import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PlayButton, Zh } from "@/components/ui";

export const metadata: Metadata = { title: "French sounds" };

// Static help page: the French sounds that trip up Mandarin speakers, with IPA and device-voice playback.
// No data, works signed out. The topic page links to the section ids below from "say" hints.

const NAV: { id: string; label: string }[] = [
  { id: "u-ou", label: "u / ou" },
  { id: "r", label: "r" },
  { id: "nasals", label: "an · on · in" },
  { id: "silent-letters", label: "Silent letters" },
  { id: "liaison", label: "Liaison" },
  { id: "e-muet", label: "Dropped e" },
  { id: "h", label: "h" },
  { id: "ch-gn-qu", label: "ch · gn · qu" },
  { id: "rhythm", label: "Rhythm" },
];

/** One example: play button, the French, its IPA, the meaning. `say` is the text sent to the voice when it differs from the label. */
function Ex({ fr, ipa, en, say }: { fr: string; ipa: string; en?: string; say?: string }) {
  return (
    <li className="snd-ex">
      <PlayButton small text={say ?? fr} label={fr} />
      <span className="snd-ex-text">
        <span className="fr" lang="fr">
          {fr}
        </span>{" "}
        <span className="ipa">{ipa}</span>
        {en && <span className="en">{en}</span>}
      </span>
    </li>
  );
}

function Examples({ children, pairs }: { children: ReactNode; pairs?: boolean }) {
  return <ul className={`snd-list${pairs ? " snd-pairs" : ""}`}>{children}</ul>;
}

function Section({ id, title, sub, zh, children }: { id: string; title: string; sub: string; zh: string; children: ReactNode }) {
  return (
    <section id={id} className="snd-section" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>
        <span lang="fr">{title}</span> <span className="snd-sub">{sub}</span>
      </h2>
      <Zh text={zh} className="zh snd-zh" />
      {children}
    </section>
  );
}

function How({ children }: { children: ReactNode }) {
  return (
    <div className="callout snd-how">
      <p>
        <strong>How to make it.</strong> {children}
      </p>
    </div>
  );
}

export default function Sounds() {
  return (
    <main className="page prose sounds">
      <h1 lang="fr">Les sons du français</h1>
      <p className="sub">French sounds — the traps for Chinese speakers.</p>
      <p>
        French spelling and French sound are two different things. This page shows the nine places where a Mandarin speaker most often goes wrong, how to make
        each sound, and a few words to copy. Tap the speaker to hear your device&rsquo;s French voice. Sounds are written in IPA between slashes, like /ty/.
        The sign <span className="ipa">‿</span> means two words are linked; <span className="ipa">ˈ</span> marks the syllable that is a little longer.
      </p>
      <Zh text="法语的拼写和发音不一致。这页讲中国人最容易出错的九个地方：怎么发音、为什么难、几个可以跟读的例词。" className="zh snd-zh" />

      <nav className="chips snd-nav" aria-label="On this page">
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`}>
            {n.label}
          </a>
        ))}
      </nav>

      {/* ---------------- u vs ou ---------------- */}
      <Section id="u-ou" title="u et ou" sub="/y/ and /u/" zh="法语 u 读 /y/，等于拼音的 ü（鱼、女）；ou 才读 /u/（路、不）。看到 tu 别念成 tū。">
        <p>
          French has two sounds here, and they change the meaning. <span className="fr-inline" lang="fr">u</span> is /y/, lips tightly rounded, tongue high at the front.{" "}
          <span className="fr-inline" lang="fr">ou</span> is /u/, lips rounded, tongue at the back.
        </p>
        <p>
          <strong>Why it is hard.</strong> The letter <em>u</em> plays a trick on pinyin readers. French <span className="fr-inline" lang="fr">tu</span> looks like
          pinyin <em>tū</em> (突), but it does not sound like it: pinyin <em>tu</em> is /tu/, which is French <span className="fr-inline" lang="fr">tout</span>. French /y/ is the
          pinyin <em>ü</em> of 鱼 <em>yú</em>, 女 <em>nǚ</em>, 绿 <em>lǜ</em> (and the hidden ü in <em>ju, qu, xu, yu</em>). So you already have this sound; you only need to
          put it after new consonants.
        </p>
        <How>
          Say /i/ (as in 一), keep the tongue exactly there, and round the lips as if you were going to whistle. That is /y/. For /u/, pull the tongue back as in 不{" "}
          <em>bù</em>. Test: say 女 <em>nǚ</em>, then change the n to t: <span className="fr-inline" lang="fr">tu</span>.
        </How>
        <Examples pairs>
          <Ex fr="tu" ipa="/ty/" en="you" />
          <Ex fr="tout" ipa="/tu/" en="all" />
          <Ex fr="rue" ipa="/ʁy/" en="street" />
          <Ex fr="roue" ipa="/ʁu/" en="wheel" />
          <Ex fr="vu" ipa="/vy/" en="seen" />
          <Ex fr="vous" ipa="/vu/" en="you (polite)" />
          <Ex fr="lu" ipa="/ly/" en="read (past)" />
          <Ex fr="loup" ipa="/lu/" en="wolf" />
        </Examples>
      </Section>

      {/* ---------------- r ---------------- */}
      <Section id="r" title="r" sub="/ʁ/" zh="法语 r 在喉咙后部，像轻轻漱口；不是拼音的 r（日），也不是英语的 r。最接近的是拼音 h（喝）加上声带振动。">
        <p>
          The French <span className="fr-inline" lang="fr">r</span> is made at the back of the mouth, where the back of the tongue almost touches the soft palate. It is a soft
          friction sound, not a tap and not a trill.
        </p>
        <p>
          <strong>Why it is hard.</strong> Pinyin <em>r</em> (日 <em>rì</em>, 人 <em>rén</em>) curls the tip of the tongue back; English <em>r</em> bunches the tongue in the
          middle. Both are in the wrong place. The closest Mandarin sound is actually pinyin <em>h</em> (喝 <em>hē</em>): same place, but French /ʁ/ adds voice (the throat
          buzzes) and is softer. Also: do not swap it for /l/. <span className="fr-inline" lang="fr">rue</span> and <span className="fr-inline" lang="fr">lu</span> are different words.
        </p>
        <How>
          Gargle very lightly with no water, or start to clear your throat gently: that is the place. Keep the tip of the tongue down behind the lower teeth. Say 喝{" "}
          <em>hē</em>, then make it buzz. Between vowels (<span className="fr-inline" lang="fr">Paris</span>) it is short and light; at the end of a word (
          <span className="fr-inline" lang="fr">bonjour</span>) it is quiet, almost a breath.
        </How>
        <Examples>
          <Ex fr="rue" ipa="/ʁy/" en="street" />
          <Ex fr="merci" ipa="/mɛʁ.si/" en="thank you" />
          <Ex fr="Paris" ipa="/pa.ʁi/" />
          <Ex fr="très" ipa="/tʁɛ/" en="very" />
          <Ex fr="bonjour" ipa="/bɔ̃.ʒuʁ/" en="hello" />
        </Examples>
      </Section>

      {/* ---------------- nasals ---------------- */}
      <Section id="nasals" title="an · on · in" sub="/ɑ̃/ · /ɔ̃/ · /ɛ̃/" zh="三个鼻化元音：气从鼻子出，但嘴不闭、舌头不碰上颚。结尾没有 n 也没有 ng。bon 不是 bong。">
        <p>
          French has three everyday nasal vowels. The air goes through the nose <em>while</em> you say the vowel, and the mouth stays open: nothing closes at the end.
          Spelling: <span className="fr-inline" lang="fr">an, en, am, em</span> → /ɑ̃/ · <span className="fr-inline" lang="fr">on, om</span> → /ɔ̃/ ·{" "}
          <span className="fr-inline" lang="fr">in, im, ain, ein, un, um</span> → /ɛ̃/.
        </p>
        <p>
          <strong>Why it is hard.</strong> Mandarin finals <em>-an, -ang, -en, -ong</em> end with a real consonant: the tongue tip touches for <em>n</em>, the back
          closes for <em>ng</em>. A French nasal vowel has no such ending. If you say <span className="fr-inline" lang="fr">bon</span> like pinyin <em>bong</em> or{" "}
          <span className="fr-inline" lang="fr">vin</span> like 因 <em>yīn</em>, a French ear hears an extra consonant. Rough starting points, with the ending removed: /ɑ̃/ is near 昂{" "}
          <em>áng</em> with the mouth open wide; /ɔ̃/ near 翁 <em>wēng</em> with round lips; /ɛ̃/ near 安 <em>ān</em> with the mouth more open, like a smile.
        </p>
        <p>
          <strong>Careful:</strong> the n is only &ldquo;nasal&rdquo; when nothing follows it. Before a vowel, or when doubled, it is a normal n and the vowel is clean:{" "}
          <span className="fr-inline" lang="fr">bon</span> /bɔ̃/ but <span className="fr-inline" lang="fr">bonne</span> /bɔn/; <span className="fr-inline" lang="fr">fin</span> /fɛ̃/ but{" "}
          <span className="fr-inline" lang="fr">fine</span> /fin/. The spelling <span className="fr-inline" lang="fr">un</span> is /œ̃/ in dictionaries, but most people in Paris
          now say it like /ɛ̃/; both are fine.
        </p>
        <How>
          Say the vowel, then let air out through the nose at the same time, and stop before the tongue moves anywhere. Check with a mirror: the mouth stays open at the end.
          Hold your nose while saying <span className="fr-inline" lang="fr">vent</span>: it should feel blocked.
        </How>
        <Examples>
          <Ex fr="vent" ipa="/vɑ̃/" en="wind" />
          <Ex fr="vont" ipa="/vɔ̃/" en="(they) go" />
          <Ex fr="vin" ipa="/vɛ̃/" en="wine" />
          <Ex fr="enfant" ipa="/ɑ̃.fɑ̃/" en="child" />
          <Ex fr="pain" ipa="/pɛ̃/" en="bread" />
          <Ex fr="un bon vin blanc" ipa="/œ̃ bɔ̃ vɛ̃ blɑ̃/" en="a good white wine" />
        </Examples>
        <Examples pairs>
          <Ex fr="bon" ipa="/bɔ̃/" en="good (m)" />
          <Ex fr="bonne" ipa="/bɔn/" en="good (f)" />
        </Examples>
      </Section>

      {/* ---------------- silent letters ---------------- */}
      <Section
        id="silent-letters"
        title="Les lettres muettes"
        sub="silent final letters"
        zh="词尾的辅音通常不发音（petit, prix, vous）。例外：c, r, f, l 常常发音（sac, bonjour, neuf, il）。动词的 -ent 不发音。"
      >
        <p>
          Most final consonants are written but not said: <span className="fr-inline" lang="fr">petit</span> /pə.ti/, <span className="fr-inline" lang="fr">prix</span> /pʁi/,{" "}
          <span className="fr-inline" lang="fr">beaucoup</span> /bo.ku/. The plural <span className="fr-inline" lang="fr">-s</span> is silent too: you hear the plural in{" "}
          <span className="fr-inline" lang="fr">les</span>, not in the noun.
        </p>
        <p>
          <strong>Why it is hard.</strong> Pinyin is honest: every letter is said. So a Chinese reader naturally says every French letter as well, and{" "}
          <span className="fr-inline" lang="fr">vous</span> comes out as &ldquo;vous-se&rdquo;. English readers have already met <em>knife</em>; pinyin readers have not had this
          training. Read the word, then take the last consonant away.
        </p>
        <p>
          <strong>The CaReFuL rule.</strong> Final <strong>c, r, f, l</strong> are usually pronounced: <span className="fr-inline" lang="fr">sac</span> /sak/,{" "}
          <span className="fr-inline" lang="fr">bonjour</span> /bɔ̃.ʒuʁ/, <span className="fr-inline" lang="fr">neuf</span> /nœf/, <span className="fr-inline" lang="fr">hôtel</span>{" "}
          /o.tɛl/. Main exception: the <span className="fr-inline" lang="fr">-er</span> of verbs is /e/ with no r (<span className="fr-inline" lang="fr">parler</span> /paʁ.le/).
        </p>
        <p>
          <strong>Verbs ending in -ent.</strong> With <span className="fr-inline" lang="fr">ils / elles</span>, the <span className="fr-inline" lang="fr">-ent</span> is completely
          silent: <span className="fr-inline" lang="fr">ils parlent</span> sounds exactly like <span className="fr-inline" lang="fr">il parle</span>. In other words,{" "}
          <span className="fr-inline" lang="fr">-ent</span> is the nasal /ɑ̃/: <span className="fr-inline" lang="fr">souvent</span> /su.vɑ̃/.
        </p>
        <Examples>
          <Ex fr="petit" ipa="/pə.ti/" en="small" />
          <Ex fr="prix" ipa="/pʁi/" en="price" />
          <Ex fr="vous" ipa="/vu/" en="you" />
          <Ex fr="beaucoup" ipa="/bo.ku/" en="a lot" />
          <Ex fr="ils parlent" ipa="/il paʁl/" en="they speak" />
          <Ex fr="sac" ipa="/sak/" en="bag (c is said)" />
        </Examples>
      </Section>

      {/* ---------------- liaison ---------------- */}
      <Section id="liaison" title="La liaison" sub="linking words" zh="一个词结尾的哑音辅音，遇到下一个词的元音时会读出来：vous‿avez /vu.za.ve/。et 后面永远不连。法语的词是连成一串的，中间没有停顿。">
        <p>
          A silent final consonant comes back to life when the next word starts with a vowel, and it jumps onto that vowel:{" "}
          <span className="fr-inline" lang="fr">vous‿avez</span> /vu.za.ve/. <span className="fr-inline" lang="fr">s</span> and <span className="fr-inline" lang="fr">x</span>{" "}
          link as /z/, <span className="fr-inline" lang="fr">t</span> and <span className="fr-inline" lang="fr">d</span> as /t/, <span className="fr-inline" lang="fr">n</span> as /n/.
        </p>
        <p>
          <strong>Required</strong> after a short determiner or pronoun (<span className="fr-inline" lang="fr">les‿amis, un‿ami, mes‿enfants, vous‿avez, ils‿ont</span>), after{" "}
          <span className="fr-inline" lang="fr">c&rsquo;est</span> (<span className="fr-inline" lang="fr">c&rsquo;est‿un café</span>), after a number (<span className="fr-inline" lang="fr">deux‿heures</span>,{" "}
          <span className="fr-inline" lang="fr">trois‿ans</span>), and after a short adjective before its noun (<span className="fr-inline" lang="fr">petit‿ami</span>).{" "}
          <strong>Never</strong> after <span className="fr-inline" lang="fr">et</span> (<span className="fr-inline" lang="fr">et | un café</span>), after a singular noun (
          <span className="fr-inline" lang="fr">un étudiant | anglais</span>), or before an h aspiré (<span className="fr-inline" lang="fr">les | haricots</span>, see{" "}
          <a href="#h">h</a>).
        </p>
        <p>
          <strong>Why it is hard.</strong> In Mandarin every character is one clean syllable, and pinyin even adds an apostrophe to keep syllables apart (
          <em>Tiān&rsquo;ānmén</em>). French does the opposite: words melt into one chain. This also happens with consonants that are always said: in{" "}
          <span className="fr-inline" lang="fr">il‿a</span> /i.la/ or <span className="fr-inline" lang="fr">une‿amie</span> /y.na.mi/ the consonant simply moves to the next
          syllable. This is called <em>enchaînement</em>. There is no gap between French words; the only gaps are at the end of a group.
        </p>
        <How>
          Say the two words as if they were one: <span className="fr-inline" lang="fr">vou-za-vez</span>, <span className="fr-inline" lang="fr">le-za-mis</span>,{" "}
          <span className="fr-inline" lang="fr">i-la</span>. If you hear yourself pause between them, start again.
        </How>
        <Examples>
          <Ex fr="vous‿avez" say="vous avez" ipa="/vu.za.ve/" en="you have" />
          <Ex fr="les‿amis" say="les amis" ipa="/le.za.mi/" en="the friends" />
          <Ex fr="un‿ami" say="un ami" ipa="/œ̃.na.mi/" en="a friend" />
          <Ex fr="c'est‿un café" say="c'est un café" ipa="/sɛ.tœ̃ ka.fe/" en="it's a café" />
          <Ex fr="il‿a" say="il a" ipa="/i.la/" en="he has" />
          <Ex fr="et | un thé" say="et un thé" ipa="/e œ̃ te/" en="and a tea (no link after et)" />
        </Examples>
      </Section>

      {/* ---------------- e muet ---------------- */}
      <Section id="e-muet" title="Le e muet" sub="the dropped e" zh="没有重音符号的 e 经常不读：samedi 读 /sam.di/，je ne sais pas 口语变成 j'sais pas。写的时候还是要写。词尾辅音后面不要加元音。">
        <p>
          A plain <span className="fr-inline" lang="fr">e</span> (no accent) is weak. At the end of a word it is silent; in the middle it is often dropped in normal
          speech: <span className="fr-inline" lang="fr">samedi</span> /sam.di/, <span className="fr-inline" lang="fr">je ne sais pas</span> becomes{" "}
          <span className="fr-inline" lang="fr">j&rsquo;sais pas</span> /ʃɛ pa/. You still <strong>write</strong> every e; this only happens when speaking.
        </p>
        <p>
          <strong>Why it is hard.</strong> Mandarin syllables never end in a consonant cluster, so the instinct is to add a small vowel after each consonant:{" "}
          <span className="fr-inline" lang="fr">table</span> becomes &ldquo;ta-bu-le&rdquo;. In French it is one syllable, /tabl/: the consonant just closes and stops.
        </p>
        <p>
          <strong>The useful side.</strong> That final e is silent, but it makes the consonant before it sound. This is how you hear gender:{" "}
          <span className="fr-inline" lang="fr">petit</span> /pə.ti/ vs <span className="fr-inline" lang="fr">petite</span> /pə.tit/, <span className="fr-inline" lang="fr">grand</span>{" "}
          /ɡʁɑ̃/ vs <span className="fr-inline" lang="fr">grande</span> /ɡʁɑ̃d/.
        </p>
        <How>
          Finish the word on the consonant with the lips or tongue closed, and do not open again. For a dropped e in the middle, run the consonants together:{" "}
          <span className="fr-inline" lang="fr">sam-di</span>, <span className="fr-inline" lang="fr">p&rsquo;tit</span>.
        </How>
        <Examples>
          <Ex fr="samedi" ipa="/sam.di/" en="Saturday" />
          <Ex fr="table" ipa="/tabl/" en="table (one syllable)" />
          <Ex fr="je ne sais pas" ipa="/ʒə nə sɛ pa/" en="I don't know (careful)" />
          <Ex fr="j'sais pas" ipa="/ʃɛ pa/" en="I dunno (everyday speech)" />
        </Examples>
        <Examples pairs>
          <Ex fr="grand" ipa="/ɡʁɑ̃/" en="tall (m)" />
          <Ex fr="grande" ipa="/ɡʁɑ̃d/" en="tall (f)" />
        </Examples>
      </Section>

      {/* ---------------- h ---------------- */}
      <Section id="h" title="h" sub="never pronounced" zh="法语的 h 永远不发音，别念成拼音的 h（喝）。h muet 像元音（l'hôtel, les‿hôtels）；h aspiré 不缩写也不连读（le haricot, les | haricots）。">
        <p>
          The letter <span className="fr-inline" lang="fr">h</span> has no sound in French. Ever. But there are two kinds, and they behave differently with the word before.
        </p>
        <p>
          <strong>h muet</strong> (most words): the word acts as if it started with a vowel. <span className="fr-inline" lang="fr">le</span> becomes{" "}
          <span className="fr-inline" lang="fr">l&rsquo;</span> and liaison happens: <span className="fr-inline" lang="fr">l&rsquo;hôtel</span> /lo.tɛl/,{" "}
          <span className="fr-inline" lang="fr">les‿hôtels</span> /le.zo.tɛl/, <span className="fr-inline" lang="fr">j&rsquo;habite</span> /ʒa.bit/.
        </p>
        <p>
          <strong>h aspiré</strong> (a small list, often old Germanic words: <span className="fr-inline" lang="fr">haricot, haut, héros, hall, hockey</span>): still silent, but the
          word acts as if it started with a consonant. No <span className="fr-inline" lang="fr">l&rsquo;</span>, no liaison, and a tiny gap:{" "}
          <span className="fr-inline" lang="fr">le haricot</span> /lə a.ʁi.ko/, <span className="fr-inline" lang="fr">les | haricots</span> /le a.ʁi.ko/,{" "}
          <span className="fr-inline" lang="fr">en | haut</span> /ɑ̃ o/. Dictionaries mark these with an asterisk (*haricot).
        </p>
        <p>
          <strong>Why it is hard.</strong> Pinyin <em>h</em> is a strong real sound (喝 <em>hē</em>), so the eye wants to say it. Remember: the French sound that is a bit like
          pinyin <em>h</em> is the <a href="#r">r</a>, not the h.
        </p>
        <Examples>
          <Ex fr="l'hôtel" ipa="/lo.tɛl/" en="the hotel" />
          <Ex fr="les‿hôtels" say="les hôtels" ipa="/le.zo.tɛl/" en="the hotels" />
          <Ex fr="j'habite" ipa="/ʒa.bit/" en="I live" />
          <Ex fr="le haricot" ipa="/lə a.ʁi.ko/" en="the bean (h aspiré)" />
          <Ex fr="les | haricots" say="les haricots" ipa="/le a.ʁi.ko/" en="the beans (no link)" />
        </Examples>
      </Section>

      {/* ---------------- ch gn qu ---------------- */}
      <Section id="ch-gn-qu" title="ch · gn · qu" sub="/ʃ/ · /ɲ/ · /k/" zh="ch 读 /ʃ/（像英语 sh，不是拼音 ch）；gn 读 /ɲ/（像很快的「ni」）；qu 读 /k/（qui 是 /ki/，不是 qi）。">
        <p>
          Three spellings that do not mean what a pinyin reader expects.
        </p>
        <p>
          <strong>ch</strong> = /ʃ/, like English <em>sh</em> in <em>she</em>. Never the pinyin <em>ch</em> of 吃 <em>chī</em>, which has a puff of air and a t in front.{" "}
          <span className="fr-inline" lang="fr">chat</span> /ʃa/ is not 茶 <em>chá</em>. Pinyin <em>sh</em> (是) is close, but keep the tongue flat, not curled back, and push the
          lips forward a little. Related: <span className="fr-inline" lang="fr">j</span> and soft <span className="fr-inline" lang="fr">g</span> (before e, i) are /ʒ/, the same sound
          with voice: <span className="fr-inline" lang="fr">je</span> /ʒə/, <span className="fr-inline" lang="fr">gens</span> /ʒɑ̃/. Beijing 日 <em>rì</em> is close to /ʒ/ if you
          keep the tongue flat.
        </p>
        <p>
          <strong>gn</strong> = /ɲ/, one sound, the tongue middle pressed to the roof of the mouth. It is the start of 牛 <em>niú</em> said very fast. It is never g + n:{" "}
          <span className="fr-inline" lang="fr">montagne</span> is /mɔ̃.taɲ/, two syllables.
        </p>
        <p>
          <strong>qu</strong> = /k/, with the u silent. Not the pinyin <em>q</em> of 七 <em>qī</em>: <span className="fr-inline" lang="fr">qui</span> is /ki/, not &ldquo;qi&rdquo;. In
          the same family, <span className="fr-inline" lang="fr">c</span> is /k/ before a, o, u (<span className="fr-inline" lang="fr">café</span>) and /s/ before e, i (
          <span className="fr-inline" lang="fr">merci</span>); <span className="fr-inline" lang="fr">ç</span> is always /s/ (<span className="fr-inline" lang="fr">ça</span> /sa/).
        </p>
        <Examples>
          <Ex fr="chat" ipa="/ʃa/" en="cat" />
          <Ex fr="chaud" ipa="/ʃo/" en="hot" />
          <Ex fr="dimanche" ipa="/di.mɑ̃ʃ/" en="Sunday" />
          <Ex fr="montagne" ipa="/mɔ̃.taɲ/" en="mountain" />
          <Ex fr="gagner" ipa="/ɡa.ɲe/" en="to win, to earn" />
          <Ex fr="qui" ipa="/ki/" en="who" />
          <Ex fr="quand" ipa="/kɑ̃/" en="when" />
          <Ex fr="pourquoi" ipa="/puʁ.kwa/" en="why" />
        </Examples>
      </Section>

      {/* ---------------- rhythm ---------------- */}
      <Section id="rhythm" title="Le rythme" sub="even beats, long last syllable, no tones" zh="法语每个音节一样长、一样平，只有词组的最后一个音节稍微拉长。没有声调：音高保持平稳，只在句末升或降。">
        <p>
          French syllables all get the same weight, like a steady drumbeat. Only the <strong>last</strong> syllable of a group is a little longer and gets the pitch movement:
          up if the sentence continues, down if it ends. There is no word stress like English, and no tones.
        </p>
        <p>
          <strong>Why it is hard.</strong> Every Mandarin syllable carries its own tone, so the voice wants to go up and down on every French syllable. The result sounds
          choppy, or like singing. Also, Mandarin often weakens the <em>last</em> syllable (妈妈, 谢谢), while French lengthens it. So{" "}
          <span className="fr-inline" lang="fr">bonjour</span> is bon-<strong>jouur</strong>, not <strong>bon</strong>-jour.
        </p>
        <How>
          Keep the pitch flat and smooth across the group, like humming one note. Give every syllable the same length. At the last syllable, hold it a little longer and let the
          voice fall (statement) or rise (question or &ldquo;not finished yet&rdquo;). Try tapping the table once per syllable.
        </How>
        <Examples>
          <Ex fr="bonjour" ipa="/bɔ̃.ˈʒuʁ/" en="hello" />
          <Ex fr="Merci beaucoup." ipa="/mɛʁ.si bo.ˈku/" en="Thank you very much." />
          <Ex fr="C'est combien ?" ipa="/sɛ kɔ̃.ˈbjɛ̃/ ↗" en="How much is it?" />
          <Ex fr="Je voudrais un café." ipa="/ʒə vu.dʁɛ œ̃ ka.ˈfe/ ↘" en="I would like a coffee." />
          <Ex fr="Je ne comprends pas." ipa="/ʒə nə kɔ̃.pʁɑ̃ ˈpa/ ↘" en="I don't understand." />
        </Examples>
      </Section>

      <p className="hint snd-foot">
        The device voice is a machine and is sometimes wrong on rare words or liaison. For the words in your topics, recorded audio (when you have a voice provider) is the
        better model.
      </p>
    </main>
  );
}
