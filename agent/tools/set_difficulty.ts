import { defineTool } from "eve/tools";
import { z } from "zod";
import { DIFFICULTIES, DIFFICULTY_BLURBS } from "../../src/lib/game-tools";

export default defineTool({
  description: "Switch the built-in opponent's search strength.",
  inputSchema: z.object({
    difficulty: z.enum(DIFFICULTIES).describe("easy, medium, hard or alpha"),
  }),
  execute: ({ difficulty }) => ({
    action: "set_difficulty" as const,
    difficulty,
    note: DIFFICULTY_BLURBS[difficulty],
  }),
});
