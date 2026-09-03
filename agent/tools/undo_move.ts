import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Take back the last pair of moves on the live board.",
  inputSchema: z.object({}),
  execute: () => ({
    action: "undo_move" as const,
    note: "The browser rolled the board back; the next client context carries the restored position.",
  }),
});
