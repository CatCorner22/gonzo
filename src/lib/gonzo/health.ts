import { getConfiguredProvider, getModelLabel } from "./model";
import { getCorpusStats } from "./corpus";

export function getEngineHealth() {
  const provider = getConfiguredProvider();
  const demoMode =
    process.env.GONZO_DEMO_MODE === "true" ||
    (provider === "none" && process.env.GONZO_DEMO_MODE !== "false");

  return {
    ok: provider !== "none" || demoMode,
    provider,
    demoMode,
    model: demoMode || provider === "none" ? null : getModelLabel(),
    corpus: getCorpusStats(),
    setup: demoMode
      ? provider !== "none"
        ? `Corpus synthesizer (GONZO_DEMO_MODE=true) — remove the flag to use ${provider}`
        : "Corpus synthesizer — add AI_GATEWAY_API_KEY for live LLM prose"
      : provider !== "none"
        ? `Ready via ${provider}`
        : "Add AI_GATEWAY_API_KEY or HF_TOKEN to .env.local",
  };
}
