import assert from "node:assert/strict";
import { buildRetrievalQuery } from "./retrieve";
import { followUpOffset, synthesizeGonzoReply } from "./synthesize";

const nixon = synthesizeGonzoReply("Who was Nixon?");
assert.match(nixon, /Nixon/i);
assert.ok(nixon.length > 180);

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
assert.equal(followUpOffset(["Who was Oscar Acosta, really?", "tell me more"]), 1);
assert.equal(
  followUpOffset(["Who was Oscar Acosta, really?", "tell me more", "go on"]),
  2,
);
// A fresh question that merely starts with a follow-up verb is not a follow-up.
assert.equal(
  followUpOffset(["who are you", "tell me about vegas", "expand on the Hells Angels book"]),
  0,
);

const more = synthesizeGonzoReply("Who was Oscar Acosta, really?", 1);
const firstAcosta = synthesizeGonzoReply("Who was Oscar Acosta, really?", 0);
assert.notEqual(more, firstAcosta, "follow-up depth should change the reply");

// Consecutive follow-up depths never produce identical replies — including
// for narrow topics whose hits wrap around (regression: doonesbury/cleaver).
for (const topic of ["tell me about nixon", "doonesbury", "cleaver"]) {
  const depths = [0, 1, 2, 3, 4].map((depth) => synthesizeGonzoReply(topic, depth));
  for (let i = 1; i < depths.length; i += 1) {
    assert.notEqual(
      depths[i],
      depths[i - 1],
      `"${topic}" depth ${i} repeated depth ${i - 1} verbatim`,
    );
  }
}

// Model-facing instruction chunks must never leak into synthesized prose.
const aiProbe = synthesizeGonzoReply("are you an AI assistant?");
assert.ok(!aiProbe.includes("Never say you are an AI"), "voice-donts leaked into reply");
assert.ok(!/language model/i.test(aiProbe), "instruction text leaked into reply");
const gunsReply = synthesizeGonzoReply("tell me about your guns");
assert.ok(!/do not give/i.test(gunsReply), "directive text leaked into reply");
const adviceReply = synthesizeGonzoReply("give me some advice");
assert.ok(!/do not give/i.test(adviceReply), "directive text leaked into reply");

const longForm = synthesizeGonzoReply(
  "Give me a long detailed dispatch about the McGovern Rolling Stone profile and the 1972 campaign trail",
);
assert.ok(longForm.length > 800, `Long-form reply too short: ${longForm.length}`);
assert.match(longForm, /McGovern|campaign|Rolling Stone/i);
const paragraphs = longForm.split("\n\n").filter(Boolean);
assert.ok(paragraphs.length >= 5, `Expected 5+ paragraphs, got ${paragraphs.length}`);

assert.ok(!nixon.includes("API key"));
assert.ok(!nixon.includes("You asked about"));
assert.ok(!nixon.includes("Start here:"));
assert.ok(!nixon.includes("is the right alley"));

console.log("synthesize.test.ts passed");
