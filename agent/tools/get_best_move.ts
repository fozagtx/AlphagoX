import { defineTool } from "eve/tools";
import { z } from "zod";
import { bestMove, DIFFICULTIES } from "../../src/lib/game-tools";

export default defineTool({
  description:
    "Compute the strongest move for a player on a board using Monte Carlo tree search. Does not change the board.",
  inputSchema: z.object({
    board: z.string().describe('Nine characters in row-major order, e.g. "X.O.X..O."'),
    player: z.enum(["X", "O"]).describe("The player to move"),
    difficulty: z.enum(DIFFICULTIES).default("alpha").describe("Search strength"),
  }),
  execute: ({ board, player, difficulty }) => bestMove(board, player, difficulty),
});
