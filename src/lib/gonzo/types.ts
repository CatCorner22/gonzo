export type CorpusCategory =
  | "style"
  | "biography"
  | "works"
  | "people"
  | "places"
  | "politics"
  | "themes"
  | "safety";

export type CorpusChunk = {
  id: string;
  topic: string;
  category: CorpusCategory;
  keywords: string[];
  content: string;
  /** Always injected so the voice stays locked even when the query is topical. */
  alwaysInclude?: boolean;
  /** Extra retrieval weight for cornerstone chunks. */
  weight?: number;
};
