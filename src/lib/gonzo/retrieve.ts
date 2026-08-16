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
  "really",
  "still",
]);

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

const GENERIC_IDENTITY_TOKENS = new Set(["who", "you", "your", "yourself"]);

const QUERY_ALIASES: Record<string, string[]> = {
  hst: ["hunter", "thompson"],
  hunter: ["thompson", "hst"],
  thompson: ["hunter", "hst"],
  vegas: ["las vegas", "nevada", "bat country"],
  "las vegas": ["vegas"],
  "bat country": ["vegas", "desert"],
  duke: ["raoul", "persona"],
  raoul: ["duke"],
  acosta: ["oscar", "dr gonzo"],
  "dr gonzo": ["acosta", "oscar"],
  "oscar acosta": ["acosta", "dr gonzo"],
  nixon: ["watergate", "rmn"],
  rmn: ["nixon"],
  mcgovern: ["1972", "campaign"],
  "owl farm": ["woody creek"],
  "woody creek": ["owl farm", "colorado"],
  derby: ["kentucky", "louisville", "churchill"],
  kentucky: ["louisville", "derby"],
  depp: ["johnny depp", "film"],
  "johnny depp": ["depp"],
  steedman: ["steadman"],
  steadman: ["ralph"],
  "rolling stone": ["wenner", "magazine"],
  "american dream": ["america", "dream"],
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
  "campaign trail": ["1972", "mcgovern", "nixon", "work-campaign-72"],
  "1972": ["campaign", "mcgovern", "nixon", "work-campaign-72"],
  "fear and loathing in las vegas": ["vegas", "work-vegas", "place-vegas"],
  "fear and loathing on the campaign trail": ["campaign", "work-campaign-72", "mcgovern"],
  muskie: ["ed", "maine", "new hampshire", "people-muskie"],
  "ed muskie": ["muskie", "people-muskie"],
  iph: ["muskie", "new hampshire", "people-muskie"],
  wallace: ["george", "alabama", "people-wallace"],
  "george wallace": ["wallace", "people-wallace"],
  humphrey: ["hubert", "1968", "people-humphrey"],
  "hubert humphrey": ["humphrey", "people-humphrey"],
  eagleton: ["mcgovern", "vp", "people-eagleton"],
  salazar: ["ruben", "east la", "people-salazar"],
  "ruben salazar": ["salazar", "people-salazar"],
  gilliam: ["terry", "film", "people-gilliam"],
  "terry gilliam": ["gilliam", "people-gilliam"],
  "del toro": ["benicio", "film", "people-del-toro"],
  talese: ["gay", "new journalism", "people-talese"],
  cleaver: ["eldridge", "panther", "people-cleaver"],
  scanlan: ["ramparts", "hinckle", "journalism-scanlan-ramparts"],
  ramparts: ["scanlan", "journalism-scanlan-ramparts"],
  objectivity: ["neutral", "bias", "journalism-objectivity-myth"],
  "new journalism": ["talese", "wolfe", "journalism-influence"],
  "gonzo journalism": ["gonzo", "journalism-gonzo-etymology", "theme-gonzo-defined"],
  chicago: ["1968", "convention", "place-chicago-68"],
  "1968": ["chicago", "convention", "place-chicago-68", "pol-1968-election"],
  miami: ["1972", "convention", "place-miami-72"],
  "super bowl": ["bill murray", "work-super-bowl"],
  doonesbury: ["trudeau", "work-doonesbury"],
  zaire: ["ali", "foreman", "work-zaire"],
  "rumble in the jungle": ["zaire", "ali", "work-zaire"],
  peacocks: ["owl farm", "theme-peacocks"],
  peacock: ["peacocks", "theme-peacocks"],
  "red shark": ["vegas", "theme-red-shark"],
  "white whale": ["hemingway", "theme-white-whale"],
  "patriot act": ["pol-patriot-act", "police"],
  "war on drugs": ["drugs", "pol-war-on-drugs"],
  "2000 election": ["bush", "gore", "pol-bush-2000"],
  "bush v gore": ["2000", "pol-bush-2000"],
  father: ["virginia", "bio-father-death"],
  cannon: ["memorial", "bio-cannon-memorial"],
  "straight arrow": ["books", "bio-straight-arrow"],
  conventions: ["campaign", "work-dispatch-convention"],
  "convention coverage": ["chicago", "miami", "work-dispatch-convention"],
  watergate: ["nixon", "work-watergate", "pol-watergate-resignation"],
  "kingdom of fear": ["memoir", "work-kingdom-of-fear"],
  "gonzo papers": ["anthology", "work-shark-hunt"],
  "writing advice": ["writer", "theme-advice-writers", "bio-habits"],
  "how to write": ["write", "writer", "theme-advice-writers"],
  paranoia: ["fear", "theme-paranoia"],
  "circus circus": ["vegas", "place-circus-circus"],
  "new hampshire": ["manchester", "muskie", "place-manchester"],
  manchester: ["new hampshire", "place-manchester"],
  iowa: ["caucus", "campaign"],
  barger: ["sonny", "hells angels", "people-barger"],
  "sonny barger": ["barger", "people-barger"],
  "juan thompson": ["son", "memoir", "people-juan"],
  "juan fitzgerald": ["juan", "memoir", "people-juan"],
  "virginia thompson": ["mother", "bio-virginia-mother"],
  streaking: ["super bowl", "work-super-bowl"],
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

const IDENTITY_QUERY_RE =
  /^(who are you|who're you|who r u|introduce yourself|what(?:'s| is) your name|tell me about yourself)\b/i;

const ALWAYS_INCLUDED = GONZO_CORPUS.filter((chunk) => chunk.alwaysInclude);

const IDENTITY_FALLBACK = ["bio-identity", "theme-gonzo-defined", "work-vegas"]
  .map((id) => CORPUS_BY_ID.get(id))
  .filter((chunk): chunk is CorpusChunk => Boolean(chunk));

type IndexedChunk = {
  chunk: CorpusChunk;
  keywords: Set<string>;
  phrases: Set<string>;
  topicTokens: Set<string>;
  contentTokens: Set<string>;
  paddedContent: string;
  paddedTopic: string;
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

function containsPhrase(paddedHaystack: string, phrase: string): boolean {
  return paddedHaystack.includes(` ${phrase} `);
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

const INDEX: IndexedChunk[] = GONZO_CORPUS.filter((chunk) => !chunk.alwaysInclude).map(
  (chunk) => {
    const keywords = new Set<string>();
    const phrases = new Set<string>();

    for (const keyword of chunk.keywords) {
      const normalized = normalize(keyword).trim();
      if (!normalized) continue;
      if (normalized.includes(" ")) {
        phrases.add(normalized);
        for (const part of normalized.split(/\s+/)) {
          if (part.length > 1) keywords.add(part);
        }
      } else {
        keywords.add(normalized);
      }
    }

    return {
      chunk,
      keywords,
      phrases,
      topicTokens: new Set(tokenize(chunk.topic)),
      contentTokens: new Set(tokenize(chunk.content)),
      paddedContent: ` ${normalize(chunk.content)} `,
      paddedTopic: ` ${normalize(chunk.topic)} `,
    };
  },
);

function expandQuery(tokens: string[], raw: string): { tokens: string[]; phrases: string[] } {
  const phrases: string[] = [];
  const lowered = normalize(raw);
  const padded = ` ${lowered} `;
  const expanded = tokens.flatMap(withInflections);

  for (const [alias, targets] of Object.entries(QUERY_ALIASES)) {
    const hit = alias.includes(" ")
      ? containsPhrase(padded, alias)
      : tokens.includes(alias);

    if (!hit) continue;

    if (alias.includes(" ")) {
      phrases.push(alias);
      expanded.push(...alias.split(" "));
    }

    for (const target of targets) {
      if (target.includes(" ")) phrases.push(target);
      expanded.push(...target.split(" "));
    }
  }

  if (containsPhrase(padded, "fear and loathing")) {
    phrases.push("fear and loathing");
    if (containsPhrase(padded, "campaign trail") || /\bcampaign\b/.test(lowered)) {
      phrases.push("campaign trail");
      expanded.push("1972", "mcgovern", "campaign", "politics");
    } else if (containsPhrase(padded, "las vegas") || tokens.includes("vegas")) {
      expanded.push("vegas", "desert", "mint");
    } else {
      expanded.push("loathing");
    }
  }

  return { tokens: unique(expanded.filter(Boolean)), phrases: unique(phrases) };
}

function scoreIndexed(
  tokens: string[],
  phrases: string[],
  entry: IndexedChunk,
  allowGenericIdentity: boolean,
): number {
  let score = 0;

  for (const phrase of phrases) {
    if (entry.phrases.has(phrase) || entry.keywords.has(phrase)) score += 12;
    else if (containsPhrase(entry.paddedTopic, phrase)) score += 6;
    else if (containsPhrase(entry.paddedContent, phrase)) score += 3;
  }

  for (const token of tokens) {
    if (!allowGenericIdentity && GENERIC_IDENTITY_TOKENS.has(token)) {
      continue;
    }

    if (entry.keywords.has(token)) {
      score += 6;
      continue;
    }
    if (entry.topicTokens.has(token)) {
      score += 3;
      continue;
    }
    if (entry.contentTokens.has(token)) {
      score += 1;
    }
  }

  return score * (entry.chunk.weight ?? 1);
}

function minimumScore(topScore: number, limit: number): number {
  if (limit >= 8) return 1;
  if (topScore >= 12) return 4;
  if (topScore >= 6) return 3;
  return 1;
}

function isIdentityQuery(raw: string, specificTokens: string[]): boolean {
  if (IDENTITY_QUERY_RE.test(raw.trim())) return true;
  return specificTokens.length === 0;
}

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

export function retrieveDetailed(query: string, limit = 8): RetrievalResult {
  const rawTokens = tokenize(query);
  const { tokens, phrases } = expandQuery(rawTokens, query);
  const specificTokens = tokens.filter((token) => !GENERIC_IDENTITY_TOKENS.has(token));
  const identityQuery = isIdentityQuery(query, specificTokens);

  if (tokens.length === 0 && phrases.length === 0) {
    return {
      query,
      tokens,
      phrases,
      hits: IDENTITY_FALLBACK.map((chunk) => ({ chunk, score: 0 })),
      alwaysIncluded: ALWAYS_INCLUDED,
    };
  }

  const ranked = INDEX.map((entry) => ({
    chunk: entry.chunk,
    score: scoreIndexed(tokens, phrases, entry, identityQuery),
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id));

  if (identityQuery && !ranked.some((hit) => hit.chunk.id === "bio-identity")) {
    const identity = CORPUS_BY_ID.get("bio-identity");
    if (identity) ranked.unshift({ chunk: identity, score: 20 });
  }

  const topScore = ranked[0]?.score ?? 0;
  const filtered = ranked.filter(({ score }) => score >= minimumScore(topScore, limit));

  return {
    query,
    tokens,
    phrases,
    hits: filtered.slice(0, limit),
    alwaysIncluded: ALWAYS_INCLUDED,
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
