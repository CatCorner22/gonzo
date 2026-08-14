"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";

type EngineHealth = {
  ok: boolean;
  provider: string;
  demoMode: boolean;
  setup: string;
  corpus: { chunks: number };
};

function getMessageText(message: {
  parts: { type: string; text?: string }[];
}): string {
  return message.parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text!)
    .join("");
}

function parseChatError(message: string): string {
  try {
    const parsed = JSON.parse(message) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    // not JSON
  }

  if (message.includes("503") || message.includes("API key")) {
    return "No API key configured. Add AI_GATEWAY_API_KEY or HF_TOKEN to .env.local and restart the dev server. Or set GONZO_DEMO_MODE=true to test without a key.";
  }

  return message;
}

const STARTERS = [
  "Who are you, and how did Gonzo start?",
  "What happened to the American Dream?",
  "Take me through the 1972 campaign.",
  "Who was Oscar Acosta, really?",
  "Describe Owl Farm after midnight.",
  "Is Las Vegas still bat country?",
];

export function GonzoChat() {
  const [input, setInput] = useState("");
  const [health, setHealth] = useState<EngineHealth | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: EngineHealth) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput("");
  }

  function handleStarter(text: string) {
    if (isBusy) return;
    sendMessage({ text });
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-amber-900/40 bg-black/40 px-6 py-5 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-amber-500/80">
              Gonzo Engine v1
            </p>
            <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-amber-50 sm:text-3xl">
              Hunter S. Thompson
            </h1>
            <p className="mt-1 text-sm text-amber-100/60">
              Fear. Loathing. Streaming prose from the edge.
            </p>
          </div>
          <div className="hidden rounded-full border border-red-500/30 bg-red-950/30 px-4 py-2 font-mono text-xs text-red-300 sm:block">
            {isBusy ? "TRANSMITTING..." : health?.ok ? "ON THE LINE" : "OFF THE AIR"}
          </div>
        </div>
      </header>

      {health && !health.ok && (
        <div className="border-b border-amber-800/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100/80">
          {health.setup}
        </div>
      )}

      {health?.demoMode && (
        <div className="border-b border-amber-700/30 bg-amber-900/20 px-4 py-2 font-mono text-xs text-amber-200/70">
          DEMO MODE — corpus-backed Gonzo synthesis (no LLM). Add AI_GATEWAY_API_KEY for live prose.
        </div>
      )}

      <div
        ref={scrollRef}
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-8 sm:px-6"
      >
        {messages.length === 0 && (
          <section className="rounded-2xl border border-amber-900/30 bg-amber-950/10 p-6">
            <h2 className="font-serif text-xl text-amber-100">
              The typewriter is warm.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-amber-100/70">
              Ask about the books, the trail, Owl Farm, Steadman, Acosta, Nixon,
              or the Dream. The engine retrieves from{" "}
              {health?.corpus.chunks ?? "100+"} Gonzo knowledge chunks and keeps
              the voice locked.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => handleStarter(starter)}
                  className="rounded-full border border-amber-700/40 bg-black/30 px-4 py-2 text-left text-xs text-amber-100/80 transition hover:border-amber-500/60 hover:bg-amber-950/40 hover:text-amber-50"
                >
                  {starter}
                </button>
              ))}
            </div>
          </section>
        )}

        {messages.map((message) => {
          const text = getMessageText(message);
          if (!text && message.role === "assistant") return null;
          const isUser = message.role === "user";

          return (
            <article
              key={message.id}
              className={`max-w-[92%] rounded-2xl px-5 py-4 ${
                isUser
                  ? "ml-auto border border-amber-700/30 bg-amber-900/20 text-amber-50"
                  : "mr-auto border border-red-900/40 bg-black/50 text-amber-50/95"
              }`}
            >
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-amber-500/70">
                {isUser ? "You" : "Thompson"}
              </p>
              <div className="whitespace-pre-wrap font-serif text-base leading-8">
                {text}
              </div>
            </article>
          );
        })}

        {isBusy && (
          <div className="mr-auto max-w-[92%] rounded-2xl border border-red-900/30 bg-black/40 px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-red-400/80">
              Gonzo is typing
              <span className="inline-block animate-pulse">...</span>
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-700/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {parseChatError(error.message)}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 border-t border-amber-900/40 bg-black/70 px-4 py-4 backdrop-blur-md sm:px-6"
      >
        <div className="mx-auto flex max-w-4xl gap-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Drop your question into the chaos..."
            disabled={isBusy}
            className="flex-1 rounded-xl border border-amber-800/40 bg-amber-950/20 px-4 py-3 font-serif text-amber-50 placeholder:text-amber-200/30 focus:border-amber-500/60 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="rounded-xl bg-red-700 px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
