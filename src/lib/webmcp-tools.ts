/**
 * WebMCP Tool Registration
 *
 * Registers structured tools for the Tic Tac Toe game using the
 * WebMCP Imperative API (document.modelContext.registerTool).
 *
 * Any browser AI agent can discover and invoke these tools.
 */

import type { Board, Player, MoveEvaluation } from "./ai-engine";

// ─── WebMCP Type Declarations ──────────────────────────────────────────────

interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}

interface ModelContext {
  registerTool: (tool: WebMCPTool) => Promise<void>;
  unregisterTool: (name: string) => Promise<void>;
}

// ─── Tool Registry ─────────────────────────────────────────────────────────

export interface ToolRegistration {
  name: string;
  description: string;
  status: "registered" | "error" | "pending";
  lastCalled?: string;
  callCount: number;
  error?: string;
}

export interface ToolRegistry {
  tools: ToolRegistration[];
  isSupported: boolean;
  isRegistered: boolean;
}

export function createToolRegistry(): ToolRegistry {
  return {
    tools: [
      { name: "get_game_state", description: "Get the current board state, player turn, and game status", status: "pending", callCount: 0 },
      { name: "play_move", description: "Place X or O on the board at a given position (0-8)", status: "pending", callCount: 0 },
      { name: "get_ai_move", description: "Ask the AI to compute the best move using AlphaGo-style MCTS", status: "pending", callCount: 0 },
      { name: "get_available_moves", description: "List all empty positions on the board", status: "pending", callCount: 0 },
      { name: "evaluate_position", description: "Run policy + value network evaluation on the current board", status: "pending", callCount: 0 },
      { name: "undo_last_move", description: "Undo the last human move (and the AI response)", status: "pending", callCount: 0 },
      { name: "reset_game", description: "Reset the board to a fresh game", status: "pending", callCount: 0 },
      { name: "set_difficulty", description: "Set AI difficulty: easy, medium, hard, or alpha", status: "pending", callCount: 0 },
      { name: "get_move_history", description: "Get the full move history of the current game", status: "pending", callCount: 0 },
    ],
    isSupported: false,
    isRegistered: false,
  };
}

// ─── Register All Tools ────────────────────────────────────────────────────

type StateGetter = () => { board: Board; currentPlayer: Player; status: string; moveHistory: { player: Player; position: number }[]; difficulty: string };
type StateSetter = (updater: (prev: ReturnType<StateGetter>) => Partial<ReturnType<StateGetter>>) => void;

export async function registerWebMCPTools(
  getState: StateGetter,
  setState: StateSetter,
  actions: {
    playMove: (pos: number) => boolean;
    undoMove: () => boolean;
    resetGame: () => void;
    setDifficulty: (d: string) => void;
    getAIMove: () => { move: number; evaluations: MoveEvaluation[] } | null;
    getEvaluations: () => MoveEvaluation[];
  }
): Promise<ToolRegistry> {
  const registry = createToolRegistry();

  // Check if WebMCP is available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelContext = (document as any).modelContext as ModelContext | undefined;
  if (!modelContext || typeof modelContext.registerTool !== "function") {
    registry.isSupported = false;
    registry.tools.forEach(t => { t.status = "error"; t.error = "WebMCP not available in this browser"; });
    return registry;
  }

  registry.isSupported = true;

  const toolDefs: WebMCPTool[] = [
    {
      name: "get_game_state",
      description: "Get the current board state, player turn, and game status",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        const s = getState();
        return {
          board: s.board,
          currentPlayer: s.currentPlayer,
          status: s.status,
          moveCount: s.moveHistory.length,
          difficulty: s.difficulty,
        };
      },
    },
    {
      name: "play_move",
      description: "Place a mark on the board. Position is 0-8 (top-left to bottom-right). Returns success and the board state after the move.",
      inputSchema: {
        type: "object",
        properties: {
          position: { type: "number", minimum: 0, maximum: 8, description: "Board position 0-8 (row-major: 0,1,2 = top row)" },
        },
        required: ["position"],
      },
      execute: async (input) => {
        const pos = input.position as number;
        if (typeof pos !== "number" || pos < 0 || pos > 8) {
          return { error: "Position must be a number between 0 and 8" };
        }
        const success = actions.playMove(pos);
        const s = getState();
        return {
          success,
          board: s.board,
          status: s.status,
          nextPlayer: s.currentPlayer,
          ...(success ? {} : { error: "Invalid move — position occupied or game over" }),
        };
      },
    },
    {
      name: "get_ai_move",
      description: "Compute the AI's best move using Monte Carlo Tree Search (AlphaGo-inspired). Returns the recommended position and evaluation details.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        const result = actions.getAIMove();
        if (!result) return { error: "No AI move available — game may be over" };
        return {
          position: result.move,
          evaluations: result.evaluations.slice(0, 5).map((e) => ({
            position: e.position,
            confidence: Math.round(e.confidence * 100) / 100,
            policyScore: Math.round(e.policyScore * 100) / 100,
            valueScore: Math.round(e.valueScore * 100) / 100,
            visitCount: e.visitCount,
          })),
        };
      },
    },
    {
      name: "get_available_moves",
      description: "List all empty positions on the board where a move can be placed.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        const s = getState();
        const available = s.board.reduce<number[]>((moves, cell, i) => {
          if (!cell) moves.push(i);
          return moves;
        }, []);
        return { availableMoves: available, count: available.length };
      },
    },
    {
      name: "evaluate_position",
      description: "Run the AI's policy and value network evaluation on the current board. Returns scores for each empty position.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        const evaluations = actions.getEvaluations();
        return {
          evaluations: evaluations.map((e) => ({
            position: e.position,
            confidence: Math.round(e.confidence * 100) / 100,
            policyScore: Math.round(e.policyScore * 100) / 100,
            valueScore: Math.round(e.valueScore * 100) / 100,
            visitCount: e.visitCount,
          })),
        };
      },
    },
    {
      name: "undo_last_move",
      description: "Undo the last human move and the AI's response. Returns the restored board state.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        const success = actions.undoMove();
        const s = getState();
        return {
          success,
          board: s.board,
          status: s.status,
          currentPlayer: s.currentPlayer,
          ...(success ? {} : { error: "Nothing to undo" }),
        };
      },
    },
    {
      name: "reset_game",
      description: "Reset the board to a fresh empty game. Clears all moves and history.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        actions.resetGame();
        const s = getState();
        return { success: true, board: s.board, status: s.status, message: "Game reset" };
      },
    },
    {
      name: "set_difficulty",
      description: "Change the AI difficulty level. easy = random plays, medium = basic MCTS, hard = deep MCTS, alpha = maximum strength MCTS.",
      inputSchema: {
        type: "object",
        properties: {
          difficulty: { type: "string", enum: ["easy", "medium", "hard", "alpha"], description: "AI difficulty level" },
        },
        required: ["difficulty"],
      },
      execute: async (input) => {
        const d = input.difficulty as string;
        if (!["easy", "medium", "hard", "alpha"].includes(d)) {
          return { error: "Difficulty must be easy, medium, hard, or alpha" };
        }
        actions.setDifficulty(d);
        return { success: true, difficulty: d, message: `Difficulty set to ${d}` };
      },
    },
    {
      name: "get_move_history",
      description: "Get the full move history of the current game, including which player moved and to which position.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        const s = getState();
        return {
          history: s.moveHistory,
          totalMoves: s.moveHistory.length,
        };
      },
    },
  ];

  // Register each tool
  for (const tool of toolDefs) {
    try {
      await modelContext.registerTool(tool);
      const reg = registry.tools.find((t) => t.name === tool.name);
      if (reg) {
        reg.status = "registered";
        reg.lastCalled = new Date().toISOString();
      }
    } catch (err) {
      const reg = registry.tools.find((t) => t.name === tool.name);
      if (reg) {
        reg.status = "error";
        reg.error = err instanceof Error ? err.message : String(err);
      }
    }
  }

  registry.isRegistered = registry.tools.some((t) => t.status === "registered");
  return registry;
}

// ─── Unregister All Tools ──────────────────────────────────────────────────

export async function unregisterAllTools(registry: ToolRegistry): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelContext = (document as any).modelContext as ModelContext | undefined;
  if (!modelContext || typeof modelContext.unregisterTool !== "function") return;

  for (const tool of registry.tools) {
    try {
      await modelContext.unregisterTool(tool.name);
      tool.status = "pending";
    } catch {
      // Ignore errors on unregister
    }
  }
}
