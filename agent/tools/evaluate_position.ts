import { defineTool } from "eve/tools";
import { z } from "zod";
import { analyzeBoard, DIFFICULTIES } from "../../src/lib/game-tools";

export default defineTool({
  description:
    "Score every empty square for a player with the MCTS policy and value networks. Returns confidence, policy score, value score and visit count per square.",
  inputSchema: z.object({
    board: z.string().describe('Nine characters in row-major order, e.g. "X.O.X..O."'),
    player: z.enum(["X", "O"]).describe("The player the scores are computed for"),
    difficulty: z.enum(DIFFICULTIES).default("alpha").describe("Search strength"),
  }),
  execute: ({ board, player, difficulty }) => analyzeBoard(board, player, difficulty),
});
