/**
 * Shared game logic for the browser UI.
 *
 * The board travels as a nine character string in row-major order,
 * where "." marks an empty square:
 *
 *   "X.O.X..O." → X at 0 and 4, O at 2 and 7
 */

import {
  getAIMove,
  getAvailableMoves,
  getGameState,
  type Board,
  type MoveEvaluation,
  type Player,
} from "./ai-engine";

export const DIFFICULTIES = ["easy", "medium", "hard", "alpha"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_BLURBS: Record<Difficulty, string> = {
  easy: "50 MCTS rollouts — makes mistakes on purpose",
  medium: "200 rollouts — plays basic strategy",
  hard: "500 rollouts — rarely loses",
  alpha: "1500 rollouts — full strength search",
};

export function parseBoard(input: string): Board {
  const cells = input.trim().toUpperCase().replace(/[\s|_-]/g, "");
  if (cells.length !== 9) {
    throw new Error(`Board must be 9 characters, received ${cells.length}`);
  }
  return [...cells].map((cell) => {
    if (cell === "X" || cell === "O") return cell;
    if (cell === "." || cell === "-") return null;
    throw new Error(`Invalid board character "${cell}" — use X, O or .`);
  });
}

export function serializeBoard(board: Board): string {
  return board.map((cell) => cell ?? ".").join("");
}

export function renderBoard(board: Board): string {
  const rows: string[] = [];
  for (let row = 0; row < 3; row++) {
    rows.push(
      board
        .slice(row * 3, row * 3 + 3)
        .map((cell) => cell ?? ".")
        .join(" ")
    );
  }
  return rows.join("\n");
}

export function summarizeEvaluations(evaluations: MoveEvaluation[]) {
  return evaluations.map((evaluation) => ({
    position: evaluation.position,
    confidence: round(evaluation.confidence),
    policyScore: round(evaluation.policyScore),
    valueScore: round(evaluation.valueScore),
    visitCount: evaluation.visitCount,
  }));
}

export function analyzeBoard(boardInput: string, player: Player, difficulty: Difficulty) {
  const board = parseBoard(boardInput);
  const state = getGameState(board);
  if (state.status !== "playing") {
    return { board: serializeBoard(board), status: state.status, evaluations: [] };
  }
  const { evaluations } = getAIMove(board, player, difficulty);
  return {
    board: serializeBoard(board),
    status: state.status,
    evaluations: summarizeEvaluations(evaluations),
  };
}

export function bestMove(boardInput: string, player: Player, difficulty: Difficulty) {
  const board = parseBoard(boardInput);
  const state = getGameState(board);
  if (state.status !== "playing") {
    return { status: state.status, move: null, evaluations: [] };
  }
  const { move, evaluations } = getAIMove(board, player, difficulty);
  return {
    status: state.status,
    move,
    evaluations: summarizeEvaluations(evaluations).slice(0, 5),
  };
}

export function applyMove(boardInput: string, position: number, mark: "X" | "O") {
  const board = parseBoard(boardInput);
  if (getGameState(board).status !== "playing") {
    throw new Error("The game is already over — reset it before playing again");
  }
  if (board[position]) {
    throw new Error(`Square ${position} already holds ${board[position]}`);
  }
  const next = [...board];
  next[position] = mark;
  const state = getGameState(next);
  return {
    board: serializeBoard(next),
    layout: renderBoard(next),
    status: state.status,
    nextPlayer: state.currentPlayer,
    winLine: state.winLine,
  };
}

export function openSquares(boardInput: string) {
  const board = parseBoard(boardInput);
  const moves = getAvailableMoves(board);
  return { availableMoves: moves, count: moves.length, layout: renderBoard(board) };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
