import { defineTool } from "eve/tools";
import { z } from "zod";
import { openSquares } from "../../src/lib/game-tools";

export default defineTool({
  description: "List every empty square on a board.",
  inputSchema: z.object({
    board: z.string().describe('Nine characters in row-major order, e.g. "X.O.X..O."'),
  }),
  execute: ({ board }) => openSquares(board),
});
