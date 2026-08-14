import { getConfiguredProvider, getModelLabel } from "./model";
import { getCorpusStats } from "./corpus";

export function getEngineHealth() {
  const provider = getConfiguredProvider();
  const demoMode = provider === "none" && process.env.GONZO_DEMO_MODE !== "false";

  return {
    ok: provider !== "none" || demoMode,
    provider,
    demoMode,
    model: provider === "none" ? null : getModelLabel(),
    corpus: getCorpusStats(),
    setup:
      provider !== "none"
        ? `Ready via ${provider}`
        : demoMode
          ? "Corpus synthesizer — add AI_GATEWAY_API_KEY for live LLM prose"
          : "Add AI_GATEWAY_API_KEY or HF_TOKEN to .env.local",
  };
}
