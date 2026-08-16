import type { CorpusCategory, CorpusChunk } from "./types";
import { retrieveDetailed } from "./retrieve";
import { semanticWeight } from "./semantic";

const OPENERS: Record<string, string[]> = {
  biography: [
    "Fine. You want the ledger. I'll give you the ledger — the long version, because the short one is always a lie.",
    "The biographical file is stained, but it's still the file. Pull up a chair.",
  ],
  works: [
    "The work is the only honest alibi I ever had. You want the shelf? Here is the shelf.",
    "Books, columns, wreckage — that's the paper trail. I'll walk you through it.",
  ],
  people: [
    "People are the story. Institutions are just the wallpaper they hide behind. Let me name names.",
    "Names matter. The country prefers cartoons. I'll draw the real faces.",
  ],
  places: [
    "Places lie beautifully. You have to arrive at the wrong hour — and stay past closing.",
    "Geography in this country is just destiny with a parking lot. I'll map it.",
  ],
  politics: [
    "Politics is a blood sport in church clothes. You asked for the weather report — this is the storm.",
    "You want the campaign weather? It was always a storm with better catering. I'll take you through it.",
  ],
  themes: [
    "Same war, different uniform. I'll trace the thread.",
    "The theme doesn't change. Only the lighting. Let me adjust the lighting.",
  ],
  style: [
    "The voice is the method. Everything else is furniture. I'll explain the music.",
  ],
  default: [
    "All right. Straight from the bunker — no handlers, no word limit.",
    "Here's the dispatch before the coffee cools. Long form, because you asked like you mean it.",
  ],
};

const CLOSERS: Record<CorpusCategory | "default", string[]> = {
  style: [
    "That's the music. Same beat in every city.",
    "Write it honest or don't write it. The rest is typing.",
  ],
  biography: [
    "That's the ledger. The rest is lawyers and weather.",
    "You wanted the life — there it is, unvarnished.",
  ],
  works: [
    "The page count is longer. The verdict isn't.",
    "Read the books if you want the full voltage. I've given you the wiring diagram.",
  ],
  people: [
    "Remember the name. The country forgets on purpose.",
    "They were real people in a fake system. Don't let the system win the memory.",
  ],
  places: [
    "Walk it at the wrong hour if you want the truth.",
    "Every place I named is still there, still lying beautifully.",
  ],
  politics: [
    "The machine keeps running. Somebody always feeds it.",
    "Vote if you must. But watch the gears — that's where the blood is.",
  ],
  themes: [
    "If that doesn't answer you, you're asking the wrong question.",
    "Same theme, new decade. The country never learns; it just redecorates.",
  ],
  safety: ["I'm the witness. Not the accomplice."],
  default: [
    "That's what I know. The rest is rumor and tomorrow's hangover.",
    "I've said enough for one dispatch. Go think about it in the dark.",
  ],
};

const BRIDGES: string[] = [
  "Which brings me to the next file in the cabinet.",
  "Follow that thread a little further.",
  "There's more — there is always more.",
  "Now the picture gets sharper, or uglier, depending on your appetite.",
  "Hold on. Another piece of the puzzle.",
  "The trail doesn't stop there.",
];

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

/** Longer queries and explicit depth requests get more paragraphs. */
export function chunkCountForQuery(query: string): number {
  const trimmed = query.trim();
  const wantsLong =
    /long|detail|deep|expand|everything|full|elaborate|in depth|tell me more|go on|continue/i.test(
      trimmed,
    );
  const isLongQuery = trimmed.length > 90 || trimmed.split(/\s+/).length > 16;

  if (wantsLong) return 6;
  if (isLongQuery) return 5;
  if (trimmed.length > 50) return 4;
  return 3;
}

export function synthesizeGonzoReply(query: string, offset = 0): string {
  const count = chunkCountForQuery(query);
  const retrieveLimit = Math.max(12, offset + count + 4);
  const detail = retrieveDetailed(query, retrieveLimit);
  const hits = detail.hits.filter((hit) => shouldUse(hit.chunk));
  const sliced = hits.slice(offset, offset + count);
  const used = sliced.length > 0 ? sliced : hits.slice(0, count);

  if (used.length === 0) {
    return [
      pick(OPENERS.default, query),
      "I don't have a clean file on that — which usually means either you invented the topic or the country hasn't lied about it loudly enough yet.",
      pick(CLOSERS.default, `${query}:close`),
    ].join("\n\n");
  }

  const primary = used[0]!.chunk;
  const openerPool = OPENERS[primary.category] ?? OPENERS.default;
  const seed = `${query}:${offset}`;
  const parts: string[] = [pick(openerPool, seed)];

  used.forEach((hit, index) => {
    if (index > 0) {
      parts.push(pick(BRIDGES, `${seed}:bridge:${index}`));
    }
    parts.push(toVoice(hit.chunk.content));
  });

  parts.push(pick(CLOSERS[primary.category] ?? CLOSERS.default, `${seed}:close`));

  return parts.join("\n\n");
}

export function followUpOffset(userMessages: string[]): number {
  const latest = userMessages.at(-1)?.trim() ?? "";
  if (!/^(tell me more|more|go on|continue|and\b|expand|elaborate|long form)/i.test(latest)) {
    return 0;
  }
  return Math.min((userMessages.length - 1) * 2, 8);
}

export function retrievalLimitForQuery(query: string): number {
  const semW = semanticWeight(query, query.split(/\s+/).filter(Boolean).length);
  const base = chunkCountForQuery(query) + 4;
  return semW > 0.5 ? Math.max(base, 12) : Math.max(base, 8);
}
