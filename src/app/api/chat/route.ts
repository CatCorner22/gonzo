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

const MAX_MESSAGES = 200;
const MAX_MESSAGE_CHARS = 32_000;

function shouldUseSynthesizer(): boolean {
  if (process.env.GONZO_DEMO_MODE === "true") return true;
  return (
    getConfiguredProvider() === "none" && process.env.GONZO_DEMO_MODE !== "false"
  );
}

function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400 });
}

function demoStreamResponse(query: string, followUpDepth: number, messages: UIMessage[]) {
  const text = synthesizeGonzoReply(query, followUpDepth);
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
  let messages: UIMessage[];
  try {
    const body = (await req.json()) as { messages?: unknown };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return badRequest("Request body must include a non-empty messages array.");
    }
    if (body.messages.length > MAX_MESSAGES) {
      return badRequest(`Too many messages (max ${MAX_MESSAGES}).`);
    }
    for (const message of body.messages) {
      const candidate = message as { role?: unknown; parts?: unknown };
      // Only conversation roles: a client-supplied "system" message would
      // otherwise reach the LLM alongside the persona prompt and override it.
      if (candidate?.role !== "user" && candidate?.role !== "assistant") {
        return badRequest('Each message must have role "user" or "assistant".');
      }
      if (!Array.isArray(candidate.parts)) {
        return badRequest("Each message must have a parts array.");
      }
      for (const part of candidate.parts) {
        const text = (part as { text?: unknown })?.text;
        if (typeof text === "string" && text.length > MAX_MESSAGE_CHARS) {
          return badRequest(`Messages are limited to ${MAX_MESSAGE_CHARS} characters.`);
        }
      }
    }
    messages = body.messages as UIMessage[];
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  try {
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
    console.error("Gonzo chat route failed:", error);
    return Response.json({ error: "Gonzo engine failure" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json(getEngineHealth());
}
