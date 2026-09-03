import { defineTool } from "eve/tools";
import { z } from "zod";
import { applyMove } from "../../src/lib/game-tools";

export default defineTool({
  description:
    "Place a mark on an empty square of the live board. The browser applies the returned board immediately.",
  inputSchema: z.object({
    board: z.string().describe("The board before the move, nine characters in row-major order"),
    position: z.number().int().min(0).max(8).describe("Square index, 0 is top-left and 8 is bottom-right"),
    mark: z.enum(["X", "O"]).describe("The mark to place"),
  }),
  execute: ({ board, position, mark }) => ({
    action: "play_move" as const,
    position,
    mark,
    ...applyMove(board, position, mark),
  }),
});
