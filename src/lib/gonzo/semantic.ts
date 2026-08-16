import { GONZO_CORPUS } from "./corpus";
import type { CorpusChunk } from "./types";

const STOP = new Set([
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
  "about",
  "into",
  "through",
  "during",
  "before",
  "after",
  "tell",
  "something",
  "anything",
  "please",
  "like",
  "really",
  "still",
  "just",
  "also",
  "very",
  "much",
  "some",
  "any",
]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/['']/g, "'").replace(/[^a-z0-9\s'-]/g, " ");
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP.has(token));
}

type SparseVector = Map<string, number>;

type IndexedSemantic = {
  chunk: CorpusChunk;
  vector: SparseVector;
  magnitude: number;
};

function termFrequency(tokens: string[]): SparseVector {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  const max = Math.max(...tf.values(), 1);
  for (const [term, count] of tf) {
    tf.set(term, count / max);
  }
  return tf;
}

function magnitude(vector: SparseVector): number {
  let sum = 0;
  for (const value of vector.values()) {
    sum += value * value;
  }
  return Math.sqrt(sum) || 1;
}

function dot(a: SparseVector, b: SparseVector): number {
  let sum = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const [term, weight] of small) {
    const other = large.get(term);
    if (other) sum += weight * other;
  }
  return sum;
}

function chunkDocument(chunk: CorpusChunk): string {
  return [chunk.topic, chunk.content, ...chunk.keywords].join(" ");
}

const CORPUS_VECTORS: IndexedSemantic[] = GONZO_CORPUS.filter((chunk) => !chunk.alwaysInclude).map(
  (chunk) => {
    const vector = termFrequency(tokenize(chunkDocument(chunk)));
    return { chunk, vector, magnitude: magnitude(vector) };
  },
);

const DF = new Map<string, number>();
for (const entry of CORPUS_VECTORS) {
  for (const term of entry.vector.keys()) {
    DF.set(term, (DF.get(term) ?? 0) + 1);
  }
}

const N = CORPUS_VECTORS.length;

function idf(term: string): number {
  const df = DF.get(term) ?? 0;
  return Math.log((N + 1) / (df + 1)) + 1;
}

function tfidfQuery(tokens: string[]): { vector: SparseVector; magnitude: number } {
  const tf = termFrequency(tokens);
  const vector = new Map<string, number>();
  for (const [term, weight] of tf) {
    vector.set(term, weight * idf(term));
  }
  return { vector, magnitude: magnitude(vector) };
}

export function semanticScores(query: string): Map<string, number> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return new Map();

  const { vector: queryVector, magnitude: queryMag } = tfidfQuery(tokens);
  const scores = new Map<string, number>();

  for (const entry of CORPUS_VECTORS) {
    const weighted = new Map<string, number>();
    for (const [term, weight] of entry.vector) {
      weighted.set(term, weight * idf(term));
    }
    const entryMag = magnitude(weighted);
    const cosine = dot(queryVector, weighted) / (queryMag * entryMag);
    if (cosine > 0.01) {
      scores.set(entry.chunk.id, cosine * (entry.chunk.weight ?? 1));
    }
  }

  return scores;
}

/** Long conversational queries benefit more from semantic matching. */
export function semanticWeight(query: string, tokenCount: number): number {
  const length = query.trim().length;
  if (length > 120 || tokenCount > 14) return 0.62;
  if (length > 70 || tokenCount > 9) return 0.45;
  if (length > 40 || tokenCount > 6) return 0.28;
  return 0.15;
}
