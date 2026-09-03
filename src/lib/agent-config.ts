/** Any free OpenRouter model with tool calling works here. */
export const DEFAULT_AGENT_MODEL = "z-ai/glm-5.2:free";

export function agentModelId(): string {
  return process.env.OPENROUTER_MODEL ?? DEFAULT_AGENT_MODEL;
}
