import { CORPUS_BY_ID, GONZO_CORPUS } from "./corpus";
import type { CorpusChunk } from "./types";

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "can",
  "me",
  "my",
  "we",
  "our",
  "your",
  "he",
  "him",
  "his",
  "she",
  "her",
  "it",
  "its",
  "they",
  "them",
  "their",
  "what",
  "which",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "am",
  "about",
  "around",
  "because",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "out",
  "off",
  "over",
  "under",
  "again",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "than",
  "too",
  "very",
  "just",
  "now",
  "tell",
  "something",
  "anything",
  "please",
  "like",
]);

/** Keep these even if they also appear on the stop list. */
const SIGNAL_WORDS = new Set([
  "who",
  "you",
  "your",
  "gonzo",
  "fear",
  "dream",
  "war",
  "gun",
  "car",
]);

const QUERY_ALIASES: Record<string, string[]> = {
  hst: ["hunter", "thompson"],
  hunter: ["thompson", "hst"],
  thompson: ["hunter", "hst"],
  vegas: ["las vegas", "nevada", "bat country"],
  "las vegas": ["vegas"],
  "bat country": ["vegas", "desert"],
  duke: ["raoul", "persona"],
  raoul: ["duke"],
  acosta: ["oscar", "dr gonzo", "gonzo"],
  "dr gonzo": ["acosta", "oscar"],
  oscar: ["acosta"],
  nixon: ["watergate", "rmn"],
  rmn: ["nixon"],
  mcgovern: ["1972", "campaign"],
  "owl farm": ["woody creek", "home"],
  "woody creek": ["owl farm", "colorado"],
  derby: ["kentucky", "louisville", "churchill"],
  kentucky: ["louisville", "derby"],
  depp: ["johnny", "film"],
  johnny: ["depp"],
  steedman: ["steadman"],
  steadman: ["ralph"],
  "rolling stone": ["wenner", "magazine"],
  "american dream": ["vegas", "america"],
  sheriff: ["freak power", "aspen"],
  "freak power": ["sheriff", "aspen"],
  angels: ["hells angels", "motorcycle"],
  "hells angels": ["angels", "oakland"],
  lono: ["hawaii"],
  hawaii: ["lono"],
  espn: ["hey rube", "sports"],
  football: ["sports", "hey rube"],
  clinton: ["better than sex"],
  "rum diary": ["san juan", "puerto rico"],
  "campaign trail": ["1972", "mcgovern"],
  "1972": ["campaign", "mcgovern"],
  suicide: ["death", "2005"],
  die: ["died", "death", "2005"],
  died: ["death", "2005"],
  death: ["2005", "owl farm"],
  write: ["book", "works"],
  wrote: ["book", "works"],
  book: ["works"],
  books: ["works"],
};

const FOLLOW_UP_RE =
  /^(yes|yeah|yep|ok|okay|and\b|what about|how about|tell me more|more|go on|continue|same|that|those|it)\b/i;

export type RetrievalHit = {
  chunk: CorpusChunk;
  score: number;
};

export type RetrievalResult = {
  query: string;
  tokens: string[];
  phrases: string[];
  hits: RetrievalHit[];
  alwaysIncluded: CorpusChunk[];
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/['’]/g, "'").replace(/[^a-z0-9\s'-]/g, " ");
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((token) => token.length > 1 && (!STOP_WORDS.has(token) || SIGNAL_WORDS.has(token)));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

const INFLECTABLE = new Set([
  "die",
  "write",
  "wrote",
  "book",
  "run",
  "go",
  "do",
  "say",
  "tell",
  "read",
  "live",
]);

function withInflections(token: string): string[] {
  const forms = new Set([token]);

  if (token.endsWith("ies") && token.length > 4) {
    forms.add(`${token.slice(0, -3)}y`);
  }
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 4) {
    forms.add(token.slice(0, -1));
  }
  if (token.endsWith("ed") && token.length > 4) {
    forms.add(token.slice(0, -2));
    if (token.endsWith("ied")) {
      forms.add(`${token.slice(0, -3)}y`);
    }
  }
  if (token.endsWith("ing") && token.length > 5) {
    forms.add(token.slice(0, -3));
  }

  if (INFLECTABLE.has(token)) {
    forms.add(`${token}s`);
    forms.add(`${token}ed`);
    forms.add(`${token}d`);
  }

  return [...forms];
}

function expandQuery(tokens: string[], raw: string): { tokens: string[]; phrases: string[] } {
  const phrases: string[] = [];
  const lowered = normalize(raw);
  const expanded = tokens.flatMap(withInflections);

  for (const [alias, targets] of Object.entries(QUERY_ALIASES)) {
    if (alias.includes(" ")) {
      if (lowered.includes(alias)) {
        phrases.push(alias);
        expanded.push(...alias.split(" "));
        expanded.push(...targets.flatMap((target) => target.split(" ")));
        phrases.push(...targets.filter((target) => target.includes(" ")));
      }
      continue;
    }
    if (tokens.includes(alias)) {
      for (const target of targets) {
        if (target.includes(" ")) phrases.push(target);
        expanded.push(...target.split(" "));
      }
    }
  }

  if (lowered.includes("fear and loathing")) {
    phrases.push("fear and loathing");
    if (lowered.includes("campaign trail") || /\bcampaign\b/.test(lowered)) {
      phrases.push("campaign trail");
      expanded.push("1972", "mcgovern", "campaign", "politics");
    } else if (lowered.includes("las vegas") || /\bvegas\b/.test(lowered)) {
      expanded.push("vegas", "desert", "mint");
    } else {
      expanded.push("loathing", "american dream");
    }
  }

  return { tokens: unique(expanded.filter(Boolean)), phrases: unique(phrases) };
}

function wordBoundaryContains(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i").test(haystack);
}

function scoreChunk(
  tokens: string[],
  phrases: string[],
  chunk: CorpusChunk,
): number {
  const keywordField = chunk.keywords.join(" ").toLowerCase();
  const topicField = chunk.topic.toLowerCase();
  const contentField = chunk.content.toLowerCase();
  let score = 0;

  for (const phrase of phrases) {
    if (chunk.keywords.some((keyword) => keyword.toLowerCase() === phrase)) score += 12;
    else if (wordBoundaryContains(keywordField, phrase)) score += 8;
    if (wordBoundaryContains(topicField, phrase)) score += 6;
    if (wordBoundaryContains(contentField, phrase)) score += 3;
  }

  for (const token of tokens) {
    if (chunk.keywords.some((keyword) => keyword.toLowerCase() === token)) {
      score += 6;
      continue;
    }
    if (chunk.keywords.some((keyword) => wordBoundaryContains(keyword, token))) {
      score += 4;
    }
    if (wordBoundaryContains(topicField, token)) score += 3;
    if (wordBoundaryContains(contentField, token)) score += 1;
  }

  return score * (chunk.weight ?? 1);
}

function minimumScore(topScore: number): number {
  if (topScore >= 12) return 3;
  if (topScore >= 6) return 2;
  return 1;
}

export function retrieveDetailed(
  query: string,
  limit = 8,
): RetrievalResult {
  const rawTokens = tokenize(query);
  const { tokens, phrases } = expandQuery(rawTokens, query);
  const alwaysIncluded = GONZO_CORPUS.filter((chunk) => chunk.alwaysInclude);

  if (tokens.length === 0 && phrases.length === 0) {
    const fallback = ["bio-identity", "theme-gonzo-defined", "work-vegas"]
      .map((id) => CORPUS_BY_ID.get(id))
      .filter((chunk): chunk is CorpusChunk => Boolean(chunk));

    return {
      query,
      tokens,
      phrases,
      hits: fallback.map((chunk) => ({ chunk, score: 0 })),
      alwaysIncluded,
    };
  }

  const ranked = GONZO_CORPUS.filter((chunk) => !chunk.alwaysInclude)
    .map((chunk) => ({ chunk, score: scoreChunk(tokens, phrases, chunk) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id));

  const topScore = ranked[0]?.score ?? 0;
  const filtered = ranked.filter(({ score }) => score >= minimumScore(topScore));

  return {
    query,
    tokens,
    phrases,
    hits: filtered.slice(0, limit),
    alwaysIncluded,
  };
}

export function retrieveContext(query: string, limit = 8): CorpusChunk[] {
  const result = retrieveDetailed(query, limit);
  const selected = [...result.alwaysIncluded];
  for (const hit of result.hits) {
    if (!selected.some((chunk) => chunk.id === hit.chunk.id)) {
      selected.push(hit.chunk);
    }
  }
  return selected;
}

export function formatRetrievedContext(chunks: CorpusChunk[]): string {
  if (chunks.length === 0) return "No retrieved context.";

  return chunks
    .map((chunk, index) => `[${index + 1}] ${chunk.topic} (${chunk.category})\n${chunk.content}`)
    .join("\n\n");
}

export function buildRetrievalQuery(userMessages: string[]): string {
  const recent = userMessages.filter(Boolean).slice(-4);
  if (recent.length === 0) return "";

  const latest = recent[recent.length - 1] ?? "";
  const aboutMatch = latest.match(/^(?:what|how)\s+about\s+(.+)/i);
  if (aboutMatch?.[1]) {
    return aboutMatch[1].trim();
  }

  if (recent.length === 1) return latest;

  if (FOLLOW_UP_RE.test(latest.trim()) || tokenize(latest).length < 3) {
    return recent.join(" ");
  }

  return latest;
}
