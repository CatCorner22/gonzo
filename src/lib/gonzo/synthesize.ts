import type { CorpusCategory, CorpusChunk } from "./types";
import { retrieveDetailed } from "./retrieve";

const OPENERS = [
  "The question landed like a process server at a wedding — wrong place, right timing, and everybody suddenly nervous.",
  "All right. You want the truth before the coffee cools, which in this country is always a reckless request.",
  "I was going to ignore this, but silence in America is just another kind of lie, and I've filed enough of those.",
  "Here's the dispatch, straight from the bunker — no handlers, no focus group, no polite throat-clearing.",
];

const CLOSERS: Record<CorpusCategory | "default", string[]> = {
  style: [
    "That's the music. Same beat in every city — only the costumes change.",
    "Write it that way or don't write it at all.",
  ],
  biography: [
    "That's the ledger. The rest is noise, lawyers, and bad weather.",
    "I lived it. I typed it. You can believe whichever version helps you sleep.",
  ],
  works: [
    "Buy the book if you want the full autopsy. What I gave you is the cause of death.",
    "The page count is longer; the verdict isn't.",
  ],
  people: [
    "People are the story. The institution is just where they hide the receipts.",
    "Remember the name. The country forgets on purpose.",
  ],
  places: [
    "Places lie beautifully. You have to walk them at the wrong hour to hear the truth.",
    "Geography is destiny in this country, and destiny is usually for sale.",
  ],
  politics: [
    "Vote if it makes you feel human. Just don't confuse the ballot with a miracle.",
    "The machine keeps running. Somebody's always feeding it fresh meat.",
  ],
  themes: [
    "Same war, different uniform. That's the American century in one sentence.",
    "If that doesn't answer you, you're asking the wrong question.",
  ],
  safety: [
    "I'm not your accomplice. I'm the witness.",
    "That's the line. Cross it on your own time.",
  ],
  default: [
    "That's what I know. The rest is rumor, bourbon, and tomorrow's hangover.",
    "File that under: things the country doesn't want in the paper.",
  ],
};

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function weaveChunk(chunk: CorpusChunk, index: number): string {
  const lead =
    index === 0
      ? "Start here:"
      : index === 1
        ? "And don't forget:"
        : "Also worth knowing:";

  const body = chunk.content
    .replace(/^You are channeling Hunter S\. Thompson[^.]*\.\s*/i, "I'm ")
    .replace(/^You are Hunter[^.]*\.\s*/i, "I'm ")
    .replace(/\bYou are\b/g, "I'm")
    .replace(/\bYou\b/g, "I")
    .replace(/\byour\b/gi, "my");

  return `${lead} ${body}`;
}

function focusLine(query: string, primary?: CorpusChunk): string {
  if (!primary) {
    return "You're fishing in deep water without a map. I'll give you what I can from memory and spite.";
  }

  const trimmed = query.trim().replace(/\?$/, "");
  return `You asked about ${trimmed.toLowerCase()}. ${primary.topic} is the right alley — let me walk you through it before the cops show up.`;
}

export function synthesizeGonzoReply(query: string): string {
  const detail = retrieveDetailed(query, 5);
  const hits = detail.hits.filter((hit) => hit.chunk.category !== "safety");

  if (hits.length === 0) {
    return [
      pick(OPENERS),
      "",
      "I don't have a clean file on that — which in Gonzo journalism usually means either you invented the topic or the country hasn't lied about it loudly enough yet.",
      "",
      pick(CLOSERS.default),
    ].join("\n");
  }

  const primary = hits[0]!.chunk;
  const woven = hits.slice(0, 3).map((hit, index) => weaveChunk(hit.chunk, index));

  return [
    pick(OPENERS),
    "",
    focusLine(query, primary),
    "",
    ...woven,
    "",
    pick(CLOSERS[primary.category] ?? CLOSERS.default),
  ].join("\n\n");
}

export function synthesizeStreamResponse(
  messages: { role: string; parts?: { type: string; text?: string }[] }[],
  write: (delta: string) => void,
): string {
  const texts = messages
    .filter((m) => m.role === "user")
    .map((m) =>
      (m.parts ?? [])
        .filter((p) => p.type === "text" && p.text)
        .map((p) => p.text!)
        .join("\n"),
    )
    .filter(Boolean);

  const latest = texts.at(-1) ?? "";
  const text = synthesizeGonzoReply(latest);

  const chunkSize = 18;
  for (let i = 0; i < text.length; i += chunkSize) {
    write(text.slice(i, i + chunkSize));
  }

  return text;
}
