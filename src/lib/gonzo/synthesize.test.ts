import assert from "node:assert/strict";
import { synthesizeGonzoReply } from "./synthesize";

const nixon = synthesizeGonzoReply("Who was Nixon?");
assert.match(nixon, /Nixon/i);
assert.ok(nixon.length > 200);
assert.ok(!nixon.includes("API key"));

const vegas = synthesizeGonzoReply("Tell me about Fear and Loathing in Las Vegas");
assert.match(vegas, /Vegas|Las Vegas|American Dream/i);

const gonzo = synthesizeGonzoReply("What is Gonzo journalism?");
assert.match(gonzo, /Gonzo|journalism|reporter/i);

console.log("synthesize.test.ts passed");
