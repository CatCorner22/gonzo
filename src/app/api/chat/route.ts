import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { buildGonzoSystemPrompt, extractLatestUserText } from "@/lib/gonzo/persona";
import { getConfiguredProvider, getGonzoModel } from "@/lib/gonzo/model";

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
    const latestUserMessage = extractLatestUserText(messages);
    const system = buildGonzoSystemPrompt(latestUserMessage);

    const result = streamText({
      model: getGonzoModel(),
      system,
      messages: await convertToModelMessages(messages),
      temperature: 0.95,
      maxOutputTokens: 1200,
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
