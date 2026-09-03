import { NextResponse } from "next/server";
import { agentModelId } from "@/lib/agent-config";
import { AGENT_TOOLS } from "@/lib/game-tools";

export function GET() {
  return NextResponse.json({
    model: agentModelId(),
    provider: "openrouter",
    configured: Boolean(process.env.OPENROUTER_API_KEY),
    tools: AGENT_TOOLS,
  });
}
