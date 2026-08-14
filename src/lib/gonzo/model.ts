import { createHuggingFace } from "@ai-sdk/huggingface";
import type { LanguageModel } from "ai";

const DEFAULT_GATEWAY_MODEL = "anthropic/claude-sonnet-4.5";
const DEFAULT_HF_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct";

export type ModelProvider = "gateway" | "huggingface";

export function getConfiguredProvider(): ModelProvider | "none" {
  if (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) {
    return "gateway";
  }
  if (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY) {
    return "huggingface";
  }
  return "none";
}

export function getGonzoModel(): LanguageModel {
  const provider = getConfiguredProvider();

  if (provider === "huggingface") {
    const hf = createHuggingFace({
      apiKey: process.env.HF_TOKEN ?? process.env.HUGGINGFACE_API_KEY,
    });
    const modelId = process.env.HF_MODEL ?? DEFAULT_HF_MODEL;
    return hf(modelId);
  }

  if (provider === "gateway") {
    const modelId = process.env.AI_GATEWAY_MODEL ?? DEFAULT_GATEWAY_MODEL;
    return modelId;
  }

  throw new Error(
    "No AI provider configured. Set AI_GATEWAY_API_KEY (recommended) or HF_TOKEN in .env.local",
  );
}

export function getModelLabel(): string {
  const provider = getConfiguredProvider();
  if (provider === "gateway") {
    return process.env.AI_GATEWAY_MODEL ?? DEFAULT_GATEWAY_MODEL;
  }
  if (provider === "huggingface") {
    return process.env.HF_MODEL ?? DEFAULT_HF_MODEL;
  }
  return "unconfigured";
}
