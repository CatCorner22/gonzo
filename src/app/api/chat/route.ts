import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { getEngineHealth } from "@/lib/gonzo/health";
import { getConfiguredProvider, getGonzoModel } from "@/lib/gonzo/model";
import { buildGonzoSystemPrompt, extractUserTexts } from "@/lib/gonzo/persona";
import { buildRetrievalQuery, retrieveDetailed } from "@/lib/gonzo/retrieve";

export const maxDuration = 60;

function buildDemoReply(latestMessage: string): string {
  const detail = retrieveDetailed(latestMessage, 4);
  const topics = detail.hits.map((hit) => hit.chunk.topic).join("; ");

  return [
    "Listen — the wires are down and I'm running on backup juice, so this is a dispatch from the bunker, not the full satellite feed.",
    "",
    `You asked about "${latestMessage.trim()}". The Gonzo engine pulled context on: ${topics || "the general madness"}.`,
    "",
    "In character I'd tell you the American Dream didn't die — it was dragged behind a convertible until it confessed to being a focus group. But you'll need an API key in .env.local (AI_GATEWAY_API_KEY or HF_TOKEN) before this typewriter gets its full voltage back.",
    "",
    "Remove GONZO_DEMO_MODE or add a real key and restart the dev server for live Gonzo prose.",
  ].join("\n");
}

function demoStreamResponse(messages: UIMessage[]) {
  const latest = extractUserTexts(messages).at(-1) ?? "";
  const text = buildDemoReply(latest);
  const messageId = "demo-text";

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      originalMessages: messages,
      execute({ writer }) {
        writer.write({ type: "text-start", id: messageId });

        const chunkSize = 28;
        for (let i = 0; i < text.length; i += chunkSize) {
          writer.write({
            type: "text-delta",
            id: messageId,
            delta: text.slice(i, i + chunkSize),
          });
        }

        writer.write({ type: "text-end", id: messageId });
      },
    }),
  });
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    const userTexts = extractUserTexts(messages);
    const retrievalQuery = buildRetrievalQuery(userTexts);

    if (getConfiguredProvider() === "none") {
      if (process.env.GONZO_DEMO_MODE === "true") {
        return demoStreamResponse(messages);
      }

      return Response.json(
        {
          error:
            "Gonzo engine needs an API key. Add AI_GATEWAY_API_KEY or HF_TOKEN to .env.local",
        },
        { status: 503 },
      );
    }

    const system = buildGonzoSystemPrompt(retrievalQuery);

    const result = streamText({
      model: getGonzoModel(),
      system,
      messages: await convertToModelMessages(messages),
      temperature: 0.9,
      maxOutputTokens: 1400,
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Gonzo engine failure";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return Response.json(getEngineHealth());
}
