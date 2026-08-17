import { getCorpusStats } from "@/lib/gonzo/corpus/index";
import { retrieveDetailed } from "@/lib/gonzo/retrieve";
import { semanticWeight } from "@/lib/gonzo/semantic";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") ?? "";
  const rawLimit = url.searchParams.get("limit");
  const parsed = rawLimit === null || rawLimit.trim() === "" ? DEFAULT_LIMIT : Number(rawLimit);
  const limit = Number.isFinite(parsed)
    ? Math.min(Math.max(Math.trunc(parsed), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  if (!query) {
    return Response.json({ stats: getCorpusStats() });
  }

  const result = retrieveDetailed(query, limit);

  return Response.json({
    stats: getCorpusStats(),
    query: result.query,
    tokens: result.tokens,
    phrases: result.phrases,
    semanticWeight: semanticWeight(query, result.tokens.length),
    alwaysIncluded: result.alwaysIncluded.map((chunk) => chunk.id),
    hits: result.hits.map((hit) => ({
      id: hit.chunk.id,
      topic: hit.chunk.topic,
      category: hit.chunk.category,
      score: hit.score,
      keywordScore: hit.keywordScore,
      semanticScore: hit.semanticScore,
    })),
  });
}
