import { getConfiguredProvider } from "./model";
import { getCorpusStats } from "./corpus";

export function getEngineHealth() {
  const provider = getConfiguredProvider();
  const demoMode = process.env.GONZO_DEMO_MODE === "true";

  return {
    ok: provider !== "none" || demoMode,
    provider,
    demoMode,
    corpus: getCorpusStats(),
    setup:
      provider !== "none"
        ? `Ready via ${provider}`
        : demoMode
          ? "Demo mode — streaming stub replies without an LLM"
          : "Add AI_GATEWAY_API_KEY or HF_TOKEN to .env.local, or set GONZO_DEMO_MODE=true",
  };
}
