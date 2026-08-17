import type { CorpusCategory, CorpusChunk } from "./types";
import { isBareFollowUp, retrieveDetailed } from "./retrieve";
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
  default: [
    "All right. Straight from the bunker — no handlers, no word limit.",
    "Here's the dispatch before the coffee cools. Long form, because you asked like you mean it.",
  ],
};

// style and safety chunks never reach synthesized replies (see shouldUse),
// so only the speakable categories need closers.
const CLOSERS: Partial<Record<CorpusCategory, string[]>> & { default: string[] } = {
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

/**
 * Deterministic pick that steps through the pool as `rotation` increases, so
 * consecutive follow-up depths always select different framing text even when
 * the wrapped chunk slice repeats.
 */
function pickRotated<T>(items: T[], seed: string, rotation: number): T {
  return items[(hashString(seed) + rotation) % items.length]!;
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
    .replace(/(^|[.!?]\s+)Thompson's\b/g, "$1My")
    .replace(/\bThompson's\b/g, "my")
    .replace(/\bFor Thompson\b/g, "For me")
    .replace(/\bWrite in first person\b/i, "I write in first person")
    .replace(/\s+/g, " ")
    .trim();
}

// Style chunks are model-facing tone instructions, not speakable prose;
// safety chunks are policy. Neither belongs in a synthesized reply.
function shouldUse(chunk: CorpusChunk): boolean {
  return chunk.category !== "safety" && chunk.category !== "style";
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

export function synthesizeGonzoReply(query: string, followUpDepth = 0): string {
  const count = chunkCountForQuery(query);
  const offset = followUpDepth * count;
  const retrieveLimit = Math.max(12, offset + count + 4);
  const detail = retrieveDetailed(query, retrieveLimit);
  const hits = detail.hits.filter((hit) => shouldUse(hit.chunk));

  if (hits.length === 0) {
    return [
      pick(OPENERS.default, query),
      "I don't have a clean file on that — which usually means either you invented the topic or the country hasn't lied about it loudly enough yet.",
      pick(CLOSERS.default, `${query}:close`),
    ].join("\n\n");
  }

  // Each follow-up advances by a full reply's worth of chunks and wraps when
  // the topic is exhausted; rotated openers/closers keep even wrapped replies
  // from repeating verbatim.
  const start = offset % hits.length;
  let used = hits.slice(start, start + count);
  if (used.length < count && start > 0) {
    used = used.concat(hits.slice(0, Math.min(count - used.length, start)));
  }

  const primary = used[0]!.chunk;
  const openerPool = OPENERS[primary.category] ?? OPENERS.default;
  const seed = `${query}:${offset}`;
  const parts: string[] = [pickRotated(openerPool, query, followUpDepth)];

  used.forEach((hit, index) => {
    if (index > 0) {
      parts.push(pick(BRIDGES, `${seed}:bridge:${index}`));
    }
    parts.push(toVoice(hit.chunk.content));
  });

  parts.push(
    pickRotated(CLOSERS[primary.category] ?? CLOSERS.default, `${query}:close`, followUpDepth),
  );

  return parts.join("\n\n");
}

/**
 * Number of consecutive trailing bare follow-ups ("tell me more", "go on").
 * A message that names its own topic ("expand on the Hells Angels book") is a
 * fresh question, not a follow-up, and resets the depth.
 */
export function followUpOffset(userMessages: string[]): number {
  let depth = 0;
  for (let i = userMessages.length - 1; i >= 1; i -= 1) {
    if (isBareFollowUp(userMessages[i] ?? "")) {
      depth += 1;
    } else {
      break;
    }
  }
  return depth;
}

export function retrievalLimitForQuery(query: string): number {
  const semW = semanticWeight(query, query.split(/\s+/).filter(Boolean).length);
  const base = chunkCountForQuery(query) + 4;
  return semW > 0.5 ? Math.max(base, 12) : Math.max(base, 8);
}
