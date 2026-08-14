import assert from "node:assert/strict";
import { getCorpusStats } from "./corpus";
import { buildRetrievalQuery, retrieveDetailed } from "./retrieve";

function idsFor(query: string): string[] {
  return retrieveDetailed(query).hits.map((hit) => hit.chunk.id);
}

function assertIncludes(query: string, expectedId: string) {
  const ids = idsFor(query);
  assert.ok(
    ids.includes(expectedId),
    `Expected "${query}" to retrieve ${expectedId}, got: ${ids.join(", ")}`,
  );
}

const stats = getCorpusStats();
assert.ok(stats.chunks >= 90, `Corpus too small: ${stats.chunks}`);
assert.equal(stats.alwaysInclude, 3);

assertIncludes("Who are you?", "bio-identity");
assertIncludes("What is Gonzo journalism?", "theme-gonzo-defined");
assertIncludes("Tell me about Fear and Loathing in Las Vegas", "work-vegas");
assertIncludes("Kentucky Derby", "work-derby-piece");
assertIncludes("Nixon", "people-nixon");
assertIncludes("Owl Farm", "place-woody-creek");
assertIncludes("Ralph Steadman", "people-steadman");
assertIncludes("Hell's Angels", "work-hells-angels");
assertIncludes("1972 campaign", "work-campaign-72");
assertIncludes("Raoul Duke", "people-raoul-duke");
assertIncludes("Oscar Acosta", "people-dr-gonzo");
assertIncludes("American Dream", "pol-american-dream");
assertIncludes("Johnny Depp", "people-depp");
assertIncludes("sheriff of Aspen", "bio-freak-power");
assertIncludes("The Rum Diary", "work-rum-diary");
assertIncludes("Hey Rube ESPN", "work-hey-rube");
assertIncludes("When did he die?", "bio-late-years");
assertIncludes("What books did he write?", "work-catalog");
assertIncludes("Tom Wolfe and New Journalism", "people-wolfe");
assertIncludes("IBM Selectric night writing", "bio-habits");

const nixonHits = retrieveDetailed("What about Nixon?", 10).hits.map((h) => h.chunk.id);
assert.ok(!nixonHits.includes("bio-big-sur"), `Nixon query polluted: ${nixonHits.join(", ")}`);
assert.ok(!nixonHits.includes("bio-puerto-rico"), `Nixon query polluted: ${nixonHits.join(", ")}`);

const campaign = retrieveDetailed("Fear and Loathing on the Campaign Trail", 5);
assert.equal(campaign.hits[0]?.chunk.id, "work-campaign-72");

const aboutNixon = buildRetrievalQuery(["What about Nixon?"]);
assert.equal(aboutNixon.toLowerCase(), "nixon?");

const vegas = retrieveDetailed("Is Las Vegas still bat country?");
assert.ok(
  vegas.hits.some((hit) => hit.chunk.id === "work-vegas" || hit.chunk.id === "place-vegas"),
  "Vegas / bat country should hit Vegas knowledge",
);

const strip = retrieveDetailed("the Vegas strip at night");
assert.ok(
  !strip.hits.some((hit) => hit.chunk.id === "theme-drugs-as-weather"),
  "substring 'trip' inside 'strip' must not pull the drugs chunk",
);

const followUp = buildRetrievalQuery([
  "Tell me about Fear and Loathing in Las Vegas",
  "tell me more",
]);
assert.match(followUp, /vegas/i);

const identity = retrieveDetailed("Who are you?");
assert.ok(identity.tokens.includes("who"));
assert.ok(identity.alwaysIncluded.some((chunk) => chunk.id === "voice-core"));

console.log(
  `retrieve.test.ts passed (${stats.chunks} chunks, categories=${JSON.stringify(stats.categories)})`,
);
