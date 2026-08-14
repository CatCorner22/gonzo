import assert from "node:assert/strict";
import { buildRetrievalQuery } from "./retrieve";
import { followUpOffset, synthesizeGonzoReply } from "./synthesize";

const nixon = synthesizeGonzoReply("Who was Nixon?");
assert.match(nixon, /Nixon/i);
assert.ok(nixon.length > 180);
assert.ok(!nixon.includes("API key"));
assert.ok(!nixon.includes("You asked about"));
assert.ok(!nixon.includes("Start here:"));
assert.ok(!nixon.includes("is the right alley"));

const vegas = synthesizeGonzoReply("Tell me about Fear and Loathing in Las Vegas");
assert.match(vegas, /Vegas|Las Vegas|American Dream/i);

const gonzo = synthesizeGonzoReply("What is Gonzo journalism?");
assert.match(gonzo, /Gonzo|journalism|reporter/i);

const followUp = synthesizeGonzoReply(
  buildRetrievalQuery([
    "Tell me about Fear and Loathing in Las Vegas",
    "tell me more",
  ]),
);
assert.match(followUp, /Vegas|Dream|desert/i);

const first = synthesizeGonzoReply("Who was Nixon?");
const second = synthesizeGonzoReply("Who was Nixon?");
assert.equal(first, second, "same query should be deterministic");

assert.equal(followUpOffset(["Who was Oscar Acosta, really?"]), 0);
assert.equal(followUpOffset(["Who was Oscar Acosta, really?", "tell me more"]), 2);

const more = synthesizeGonzoReply("Who was Oscar Acosta, really?", 2);
const firstAcosta = synthesizeGonzoReply("Who was Oscar Acosta, really?", 0);
assert.notEqual(more, firstAcosta, "follow-up offset should change the reply");

console.log("synthesize.test.ts passed");
