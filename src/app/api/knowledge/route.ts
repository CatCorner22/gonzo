import { getCorpusStats } from "@/lib/gonzo/corpus/index";
import { retrieveDetailed } from "@/lib/gonzo/retrieve";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? 8);

  if (!query) {
    return Response.json({ stats: getCorpusStats() });
  }

  const result = retrieveDetailed(query, Number.isFinite(limit) ? limit : 8);

  return Response.json({
    stats: getCorpusStats(),
    query: result.query,
    tokens: result.tokens,
    phrases: result.phrases,
    alwaysIncluded: result.alwaysIncluded.map((chunk) => chunk.id),
    hits: result.hits.map((hit) => ({
      id: hit.chunk.id,
      topic: hit.chunk.topic,
      category: hit.chunk.category,
      score: hit.score,
    })),
  });
}
