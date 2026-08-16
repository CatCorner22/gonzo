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
import { buildRetrievalQuery } from "@/lib/gonzo/retrieve";
import { followUpOffset, synthesizeGonzoReply } from "@/lib/gonzo/synthesize";

export const maxDuration = 60;

function shouldUseSynthesizer(): boolean {
  return (
    getConfiguredProvider() === "none" && process.env.GONZO_DEMO_MODE !== "false"
  );
}

function demoStreamResponse(query: string, offset: number, messages: UIMessage[]) {
  const text = synthesizeGonzoReply(query, offset);
  const messageId = crypto.randomUUID();

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      originalMessages: messages,
      execute({ writer }) {
        writer.write({ type: "text-start", id: messageId });

        const chunkSize = 36;
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

    if (shouldUseSynthesizer()) {
      return demoStreamResponse(
        retrievalQuery || userTexts.at(-1) || "",
        followUpOffset(userTexts),
        messages,
      );
    }

    if (getConfiguredProvider() === "none") {
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
      maxOutputTokens: 3200,
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
