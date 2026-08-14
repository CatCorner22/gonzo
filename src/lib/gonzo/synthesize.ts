import type { CorpusCategory, CorpusChunk } from "./types";
import { retrieveDetailed } from "./retrieve";

const OPENERS: Record<string, string[]> = {
  biography: [
    "Fine. You want the ledger. I'll give you the ledger.",
    "The biographical file is stained, but it's still the file.",
  ],
  works: [
    "The work is the only honest alibi I ever had.",
    "Books, columns, wreckage — that's the paper trail.",
  ],
  people: [
    "People are the story. Institutions are just the wallpaper they hide behind.",
    "Names matter. The country prefers cartoons.",
  ],
  places: [
    "Places lie beautifully. You have to arrive at the wrong hour.",
    "Geography in this country is just destiny with a parking lot.",
  ],
  politics: [
    "Politics is a blood sport in church clothes.",
    "You want the campaign weather? It was always a storm with better catering.",
  ],
  themes: [
    "Same war, different uniform.",
    "The theme doesn't change. Only the lighting.",
  ],
  style: [
    "The voice is the method. Everything else is furniture.",
  ],
  default: [
    "All right. Straight from the bunker — no handlers.",
    "Here's the dispatch before the coffee cools.",
  ],
};

const CLOSERS: Record<CorpusCategory | "default", string[]> = {
  style: ["That's the music. Same beat in every city."],
  biography: ["That's the ledger. The rest is lawyers and weather."],
  works: ["The page count is longer. The verdict isn't."],
  people: ["Remember the name. The country forgets on purpose."],
  places: ["Walk it at the wrong hour if you want the truth."],
  politics: ["The machine keeps running. Somebody always feeds it."],
  themes: ["If that doesn't answer you, you're asking the wrong question."],
  safety: ["I'm the witness. Not the accomplice."],
  default: ["That's what I know. The rest is rumor and tomorrow's hangover."],
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pick<T>(items: T[], seed: string): T {
  return items[hashString(seed) % items.length]!;
}

function toVoice(content: string): string {
  return content
    .replace(/^EXEMPLAR TONE:\s*/i, "")
    .replace(/^You are channeling Hunter S\. Thompson[^.]*:\s*/i, "I'm ")
    .replace(/^You are Hunter Stockton Thompson/i, "I'm Hunter Stockton Thompson")
    .replace(/^You are Hunter[^.]*\.\s*/i, "")
    .replace(/\bYou lived\b/g, "I lived")
    .replace(/\bYou wrote\b/g, "I wrote")
    .replace(/\bYou treated\b/g, "I treated")
    .replace(/\bThompson's\b/g, "My")
    .replace(/\bWrite in first person\b/i, "I write in first person")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldUse(chunk: CorpusChunk): boolean {
  return chunk.category !== "safety" && !chunk.id.startsWith("voice-exemplar");
}

export function synthesizeGonzoReply(query: string, offset = 0): string {
  const detail = retrieveDetailed(query, Math.max(8, offset + 4));
  const hits = detail.hits.filter((hit) => shouldUse(hit.chunk));
  const sliced = hits.slice(offset, offset + 3);
  const used = sliced.length > 0 ? sliced : hits.slice(0, 3);

  if (used.length === 0) {
    return [
      pick(OPENERS.default, query),
      "I don't have a clean file on that — which usually means either you invented the topic or the country hasn't lied about it loudly enough yet.",
      pick(CLOSERS.default, `${query}:close`),
    ].join("\n\n");
  }

  const primary = used[0]!.chunk;
  const openerPool = OPENERS[primary.category] ?? OPENERS.default;
  const paragraphs = used.map((hit) => toVoice(hit.chunk.content));
  const seed = `${query}:${offset}`;

  return [
    pick(openerPool, seed),
    ...paragraphs,
    pick(CLOSERS[primary.category] ?? CLOSERS.default, `${seed}:close`),
  ].join("\n\n");
}

export function followUpOffset(userMessages: string[]): number {
  const latest = userMessages.at(-1)?.trim() ?? "";
  if (!/^(tell me more|more|go on|continue|and\b)/i.test(latest)) {
    return 0;
  }
  return Math.min((userMessages.length - 1) * 2, 6);
}
