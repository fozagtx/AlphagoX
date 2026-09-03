import { DIFFICULTIES, type Difficulty } from "./game-tools";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** Live game state handed to the agent with every turn. */
export type GameContext = { [key: string]: JsonValue };

/** A board change the agent asked for, applied by the browser. */
export type AgentAction =
  | { type: "play_move"; position: number; mark: "X" | "O" }
  | { type: "undo_move" }
  | { type: "reset_game" }
  | { type: "set_difficulty"; difficulty: Difficulty };

export function parseAgentAction(output: unknown): AgentAction | null {
  if (typeof output !== "object" || output === null) return null;
  const record = output as Record<string, unknown>;

  switch (record.action) {
    case "play_move": {
      const { position, mark } = record;
      if (typeof position !== "number" || (mark !== "X" && mark !== "O")) return null;
      return { type: "play_move", position, mark };
    }
    case "undo_move":
      return { type: "undo_move" };
    case "reset_game":
      return { type: "reset_game" };
    case "set_difficulty": {
      const { difficulty } = record;
      if (!DIFFICULTIES.includes(difficulty as Difficulty)) return null;
      return { type: "set_difficulty", difficulty: difficulty as Difficulty };
    }
    default:
      return null;
  }
}
