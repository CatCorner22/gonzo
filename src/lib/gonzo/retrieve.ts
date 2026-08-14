import { GONZO_CORPUS, type CorpusChunk } from "./corpus";

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
  "shall",
  "can",
  "need",
  "dare",
  "ought",
  "used",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
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
  "who",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "am",
  "about",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "up",
  "down",
  "out",
  "off",
  "over",
  "under",
  "again",
  "further",
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
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "don",
  "now",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function scoreChunk(queryTokens: string[], chunk: CorpusChunk): number {
  const haystack = `${chunk.topic} ${chunk.keywords.join(" ")} ${chunk.content}`.toLowerCase();
  let score = 0;

  for (const token of queryTokens) {
    if (chunk.keywords.some((keyword) => keyword.includes(token) || token.includes(keyword))) {
      score += 3;
    }
    if (haystack.includes(token)) {
      score += 1;
    }
  }

  return score;
}

export function retrieveContext(query: string, limit = 4): CorpusChunk[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return GONZO_CORPUS.filter((chunk) =>
      ["voice-style", "vocabulary", "biography", "boundaries"].includes(chunk.id),
    ).slice(0, limit);
  }

  const ranked = GONZO_CORPUS.map((chunk) => ({
    chunk,
    score: scoreChunk(queryTokens, chunk),
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = ranked.slice(0, limit).map(({ chunk }) => chunk);

  if (selected.length < limit) {
    const fallbackIds = ["voice-style", "vocabulary", "biography", "boundaries"];
    for (const id of fallbackIds) {
      if (selected.length >= limit) break;
      const chunk = GONZO_CORPUS.find((entry) => entry.id === id);
      if (chunk && !selected.some((item) => item.id === chunk.id)) {
        selected.push(chunk);
      }
    }
  }

  return selected;
}

export function formatRetrievedContext(chunks: CorpusChunk[]): string {
  if (chunks.length === 0) {
    return "No retrieved context.";
  }

  return chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] (${chunk.topic})\n${chunk.content}`,
    )
    .join("\n\n");
}
