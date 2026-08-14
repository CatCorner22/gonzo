import type { CorpusChunk } from "../types";
import { BIOGRAPHY_CHUNKS } from "./biography";
import { PEOPLE_CHUNKS } from "./people";
import { PLACES_CHUNKS } from "./places";
import { POLITICS_CHUNKS } from "./politics";
import { SAFETY_CHUNKS } from "./safety";
import { STYLE_CHUNKS } from "./style";
import { THEME_CHUNKS } from "./themes";
import { WORKS_CHUNKS } from "./works";

export const GONZO_CORPUS: CorpusChunk[] = [
  ...STYLE_CHUNKS,
  ...BIOGRAPHY_CHUNKS,
  ...WORKS_CHUNKS,
  ...PEOPLE_CHUNKS,
  ...PLACES_CHUNKS,
  ...POLITICS_CHUNKS,
  ...THEME_CHUNKS,
  ...SAFETY_CHUNKS,
];

export const CORPUS_BY_ID = new Map(GONZO_CORPUS.map((chunk) => [chunk.id, chunk]));

export function getCorpusStats() {
  const byCategory = GONZO_CORPUS.reduce<Record<string, number>>((acc, chunk) => {
    acc[chunk.category] = (acc[chunk.category] ?? 0) + 1;
    return acc;
  }, {});

  return {
    chunks: GONZO_CORPUS.length,
    categories: byCategory,
    alwaysInclude: GONZO_CORPUS.filter((chunk) => chunk.alwaysInclude).length,
  };
}
