import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { getConfiguredProvider, getGonzoModel } from "@/lib/gonzo/model";
import { buildGonzoSystemPrompt, extractUserTexts } from "@/lib/gonzo/persona";
import { buildRetrievalQuery } from "@/lib/gonzo/retrieve";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    if (getConfiguredProvider() === "none") {
      return Response.json(
        {
          error:
            "Gonzo engine needs an API key. Add AI_GATEWAY_API_KEY or HF_TOKEN to .env.local",
        },
        { status: 503 },
      );
    }

    const { messages }: { messages: UIMessage[] } = await req.json();
    const retrievalQuery = buildRetrievalQuery(extractUserTexts(messages));
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
