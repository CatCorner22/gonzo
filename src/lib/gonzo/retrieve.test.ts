import assert from "node:assert/strict";
import { getCorpusStats, validateCorpus } from "./corpus";
import { buildRetrievalQuery, isBareFollowUp, retrieveDetailed } from "./retrieve";

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
assert.ok(stats.chunks >= 180, `Corpus too small: ${stats.chunks}`);
assert.equal(stats.alwaysInclude, 3);
assert.deepEqual(validateCorpus(), [], "corpus integrity check failed");

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
assertIncludes("Ed Muskie snowflakes", "people-muskie");
assertIncludes("George Wallace Alabama", "people-wallace");
assertIncludes("Ruben Salazar", "people-salazar");
assertIncludes("Terry Gilliam film", "people-gilliam");
assertIncludes("Scanlan's Monthly", "journalism-scanlan-ramparts");
assertIncludes("Chicago 1968 convention", "place-chicago-68");
assertIncludes("Rumble in the Jungle", "work-zaire");
assertIncludes("Watergate Nixon", "work-watergate");
assertIncludes("Peacocks at Owl Farm", "theme-peacocks");
assertIncludes("Gonzo etymology", "journalism-gonzo-etymology");
assertIncludes("Patriot Act", "pol-patriot-act");
assertIncludes("War on drugs", "pol-war-on-drugs");
assertIncludes("Father Jack Thompson", "bio-father-death");
assertIncludes("Doonesbury Duke", "work-doonesbury");
assertIncludes("McGovern Rolling Stone profile", "rs-mcgovern-profile");
assertIncludes("Fear and Loathing Campaign Trail 2000", "rs-bush-2000");
assertIncludes("Rolling Stone Watergate coverage", "rs-watergate-dispatch");
assertIncludes("Wave speech American Dream", "rs-wave-speech");
assertIncludes("McCain Rolling Stone 2000", "rs-mccain-2000");
assertIncludes("Hey Rube ESPN columns", "rs-espn-hey-rube");

const longQuery = retrieveDetailed(
  "I have been reading about the nineteen seventies and I am curious how Hunter Thompson covered the McGovern campaign for Rolling Stone and what he thought about Nixon during that whole disastrous season when the country seemed to be eating itself",
  8,
);
assert.ok(
  longQuery.hits.some((h) => h.chunk.id === "rs-mcgovern-profile" || h.chunk.id === "rs-nixon-dispatch"),
  `Long conversational query should hit RS campaign chunks: ${longQuery.hits.map((h) => h.chunk.id).join(", ")}`,
);
assert.ok(
  longQuery.hits[0]?.semanticScore > 0 || longQuery.hits.some((h) => h.semanticScore > 0),
  "Long query should activate semantic scoring",
);

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

const nixonToYou = retrieveDetailed("Who was Nixon to you?");
assert.equal(nixonToYou.hits[0]?.chunk.id, "people-nixon");
assert.ok(!nixonToYou.hits.some((hit) => hit.chunk.id === "bio-identity"));

// Possessive forms must reach the same chunks as their base nouns.
assertIncludes("Acosta's disappearance", "people-dr-gonzo");
assertIncludes("Nixon's resignation", "people-nixon");
assertIncludes("Muskie's tears", "people-muskie");
assertIncludes("Steadman's drawings", "people-steadman");

// Curly (typographic) apostrophes must behave like ASCII ones.
assertIncludes("Hell’s Angels", "work-hells-angels");
const straightTop = retrieveDetailed("Hell's Angels").hits[0]?.chunk.id;
const curlyTop = retrieveDetailed("Hell’s Angels").hits[0]?.chunk.id;
assert.equal(curlyTop, straightTop, "apostrophe glyph changed the top hit");

// Chunk-id alias targets must boost the wired chunk into the hits.
assertIncludes("tell me about new journalism", "journalism-influence");
assertIncludes("what happened at the conventions", "work-dispatch-convention");
assertIncludes("writing advice", "bio-habits");
assertIncludes("What was the ibogaine story?", "people-muskie");

// "What about <anaphor>?" keeps prior context instead of resetting to identity.
const aboutIt = buildRetrievalQuery(["tell me about vegas", "What about it?"]);
assert.match(aboutIt, /vegas/i);
const aboutThat = buildRetrievalQuery(["tell me about muskie", "HOW ABOUT THAT"]);
assert.match(aboutThat, /muskie/i);

// A terse fresh topic must not be displaced by the previous question.
const terse = buildRetrievalQuery(["What happened to the American Dream?", "steadman?"]);
assert.equal(terse.toLowerCase(), "steadman?");

// A run of bare follow-ups keeps the original subject in the joined query.
const deepFollowUp = buildRetrievalQuery([
  "tell me about nixon",
  "tell me more",
  "go on",
  "tell me more",
]);
assert.match(deepFollowUp, /nixon/i);

// ...even when the run is long enough to push the topic out of a fixed window.
const longFollowUp = buildRetrievalQuery([
  "tell me about nixon",
  "tell me more",
  "go on",
  "tell me more",
  "go on",
  "tell me more",
  "go on",
]);
assert.match(longFollowUp, /nixon/i);

// Identity re-asks mid-conversation stay identity queries.
const midIdentity = buildRetrievalQuery(["tell me about vegas", "who are you?"]);
assert.equal(midIdentity, "who are you?");

assert.ok(isBareFollowUp("tell me more"));
assert.ok(isBareFollowUp("go on"));
assert.ok(isBareFollowUp("elaborate"));
assert.ok(!isBareFollowUp("expand on the Hells Angels book"));
assert.ok(!isBareFollowUp("Who was Nixon?"));

console.log(
  `retrieve.test.ts passed (${stats.chunks} chunks, categories=${JSON.stringify(stats.categories)})`,
);
