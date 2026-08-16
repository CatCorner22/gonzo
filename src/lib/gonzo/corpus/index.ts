import type { CorpusChunk } from "../types";
import { BIOGRAPHY_CHUNKS } from "./biography";
import { CAMPAIGN_FIGURES_CHUNKS } from "./campaign-figures";
import { EXPANDED_BIO_CHUNKS } from "./expanded-bio";
import { EXPANDED_PLACES_CHUNKS } from "./expanded-places";
import { EXPANDED_POLITICS_CHUNKS } from "./expanded-politics";
import { EXPANDED_THEME_CHUNKS } from "./expanded-themes";
import { EXPANDED_WORKS_CHUNKS } from "./expanded-works";
import { JOURNALISM_CHUNKS } from "./journalism";
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
  ...EXPANDED_BIO_CHUNKS,
  ...WORKS_CHUNKS,
  ...EXPANDED_WORKS_CHUNKS,
  ...PEOPLE_CHUNKS,
  ...CAMPAIGN_FIGURES_CHUNKS,
  ...PLACES_CHUNKS,
  ...EXPANDED_PLACES_CHUNKS,
  ...POLITICS_CHUNKS,
  ...EXPANDED_POLITICS_CHUNKS,
  ...THEME_CHUNKS,
  ...EXPANDED_THEME_CHUNKS,
  ...JOURNALISM_CHUNKS,
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

/** Detect duplicate ids at build/test time */
export function validateCorpus(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const chunk of GONZO_CORPUS) {
    if (seen.has(chunk.id)) errors.push(`Duplicate chunk id: ${chunk.id}`);
    seen.add(chunk.id);
    if (!chunk.content.trim()) errors.push(`Empty content: ${chunk.id}`);
    if (chunk.keywords.length === 0) errors.push(`No keywords: ${chunk.id}`);
  }

  return errors;
}
