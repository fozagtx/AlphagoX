import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { defineAgent } from "eve";
import { agentModelId } from "../src/lib/agent-config";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  headers: {
    "HTTP-Referer": "https://github.com/fozagtx/AlphagoX",
    "X-Title": "AlphagoX",
  },
});

/** OpenRouter models are not in the AI Gateway metadata, so the window is declared here. */
const CONTEXT_WINDOW_TOKENS = 128_000;

export default defineAgent({
  model: openrouter.chat(agentModelId()),
  modelContextWindowTokens: CONTEXT_WINDOW_TOKENS,
  compaction: { modelContextWindowTokens: CONTEXT_WINDOW_TOKENS },
  reasoning: "medium",
});
