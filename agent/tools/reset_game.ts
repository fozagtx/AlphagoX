import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Clear the live board and start a new game with X to move.",
  inputSchema: z.object({}),
  execute: () => ({
    action: "reset_game" as const,
    board: ".........",
    nextPlayer: "X" as const,
  }),
});
