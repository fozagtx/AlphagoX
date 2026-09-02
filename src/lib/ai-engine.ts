/**
 * AlphaGo-Inspired Tic Tac Toe AI Engine
 *
 * Implements a simplified version of AlphaGo's approach:
 * - Monte Carlo Tree Search (MCTS) with UCT selection
 * - Policy network (pattern-based move scoring)
 * - Value network (board evaluation)
 * - Rollout policy for MCTS simulations
 */

export type Player = "X" | "O" | null;
export type Board = Player[];
export type GameStatus = "playing" | "X_wins" | "O_wins" | "draw";

export interface GameState {
  board: Board;
  currentPlayer: Player;
  status: GameStatus;
  moveHistory: number[];
  winLine: number[] | null;
}

export interface MoveEvaluation {
  position: number;
  policyScore: number;   // How "good" the move looks initially (0-1)
  valueScore: number;    // Win probability from this position (0-1)
  visitCount: number;    // How many MCTS simulations explored this
  confidence: number;    // Final combined score (0-1)
}

// All winning line indices
const WIN_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diags
];

// Position importance weights (simulates a value network)
// Inspired by AlphaGo's observation that center and corners dominate tic-tac-toe
const POSITION_WEIGHTS = [
  0.3, 0.15, 0.3,
  0.15, 0.5, 0.15,
  0.3, 0.15, 0.3,
];

// ─── Board Utilities ───────────────────────────────────────────────────────

export function createEmptyBoard(): Board {
  return Array(9).fill(null);
}

export function checkWinner(board: Board): { winner: Player; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

export function getAvailableMoves(board: Board): number[] {
  return board.reduce<number[]>((moves, cell, i) => {
    if (!cell) moves.push(i);
    return moves;
  }, []);
}

export function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

export function getGameState(board: Board): GameState {
  const { winner, line } = checkWinner(board);
  let status: GameStatus = "playing";
  if (winner === "X") status = "X_wins";
  else if (winner === "O") status = "O_wins";
  else if (isBoardFull(board)) status = "draw";

  // Determine current player by counting moves
  const xCount = board.filter((c) => c === "X").length;
  const oCount = board.filter((c) => c === "O").length;
  const currentPlayer: Player = xCount <= oCount ? "X" : "O";

  return { board, currentPlayer, status, moveHistory: [], winLine: line };
}

// ─── Policy Network (Pattern-Based Evaluation) ────────────────────────────

/**
 * Simulates a policy network that scores each possible move.
 * Uses strategic patterns learned from AlphaGo's principles:
 * 1. Immediate wins/blocks (highest priority)
 * 2. Fork creation (creating multiple threats)
 * 3. Center/corner control
 * 4. Opponent threat suppression
 */
export function policyNetwork(board: Board, player: Player): Map<number, number> {
  const moves = getAvailableMoves(board);
  const opponent: Player = player === "X" ? "O" : "X";
  const scores = new Map<number, number>();

  for (const move of moves) {
    let score = 0;

    // 1. Check if this move wins the game
    const testBoard = [...board];
    testBoard[move] = player;
    const { winner } = checkWinner(testBoard);
    if (winner === player) {
      score += 100;
    }

    // 2. Check if this move blocks opponent's win
    testBoard[move] = opponent;
    const { winner: oppWinner } = checkWinner(testBoard);
    testBoard[move] = null;
    if (oppWinner === opponent) {
      score += 90;
    }

    // 3. Evaluate fork potential (creating multiple threats)
    testBoard[move] = player;
    let threats = 0;
    for (const line of WIN_LINES) {
      const lineCells = line.map((i) => testBoard[i]);
      const playerCount = lineCells.filter((c) => c === player).length;
      const emptyCount = lineCells.filter((c) => c === null).length;
      if (playerCount === 2 && emptyCount === 1) threats++;
    }
    if (threats >= 2) score += 50;
    else if (threats === 1) score += 15;
    testBoard[move] = null;

    // 4. Position-based evaluation (center > corners > edges)
    score += POSITION_WEIGHTS[move] * 30;

    // 5. Check opponent fork potential (blocking)
    testBoard[move] = opponent;
    let oppThreats = 0;
    for (const line of WIN_LINES) {
      const lineCells = line.map((i) => testBoard[i]);
      const oppCount = lineCells.filter((c) => c === opponent).length;
      const emptyCount = lineCells.filter((c) => c === null).length;
      if (oppCount === 2 && emptyCount === 1) oppThreats++;
    }
    if (oppThreats >= 2) score += 40;
    testBoard[move] = null;

    scores.set(move, score);
  }

  // Normalize scores to 0-1
  const maxScore = Math.max(...Array.from(scores.values()), 1);
  for (const [move, score] of scores) {
    scores.set(move, score / maxScore);
  }

  return scores;
}

// ─── Value Network (Board Evaluation) ──────────────────────────────────────

/**
 * Simulates a value network that evaluates board positions.
 * Returns the probability of the given player winning from this position.
 */
export function valueNetwork(board: Board, player: Player): number {
  const { winner } = checkWinner(board);
  if (winner === player) return 1.0;
  if (winner && winner !== player) return 0.0;
  if (isBoardFull(board)) return 0.5;

  const opponent: Player = player === "X" ? "O" : "X";
  let score = 0.5; // Start at neutral

  // Count threats and blocks
  for (const line of WIN_LINES) {
    const lineCells = line.map((i) => board[i]);
    const playerCount = lineCells.filter((c) => c === player).length;
    const oppCount = lineCells.filter((c) => c === opponent).length;
    const emptyCount = lineCells.filter((c) => c === null).length;

    // Two in a row with space = good threat
    if (playerCount === 2 && emptyCount === 1) score += 0.15;
    if (oppCount === 2 && emptyCount === 1) score -= 0.15;
  }

  // Center control bonus
  if (board[4] === player) score += 0.1;
  if (board[4] === opponent) score -= 0.1;

  // Corner control bonus
  for (const corner of [0, 2, 6, 8]) {
    if (board[corner] === player) score += 0.05;
    if (board[corner] === opponent) score -= 0.05;
  }

  return Math.max(0.05, Math.min(0.95, score));
}

// ─── MCTS Node ─────────────────────────────────────────────────────────────

interface MCTSNode {
  board: Board;
  player: Player; // Player who just moved to get here
  parent: MCTSNode | null;
  children: Map<number, MCTSNode>;
  visits: number;
  wins: number;
  move: number | null; // Move that led to this node
  untriedMoves: number[];
}

function createNode(
  board: Board,
  player: Player,
  parent: MCTSNode | null,
  move: number | null
): MCTSNode {
  return {
    board: [...board],
    player,
    parent,
    children: new Map(),
    visits: 0,
    wins: 0,
    move,
    untriedMoves: parent ? getAvailableMoves(board) : [],
  };
}

// ─── MCTS Engine (AlphaGo-inspired) ───────────────────────────────────────

/**
 * Monte Carlo Tree Search with UCT (Upper Confidence Bound for Trees)
 *
 * AlphaGo's key insight: combine tree search with neural network evaluation.
 * We simulate this by:
 * 1. Selection: UCT formula balances exploration vs exploitation
 * 2. Expansion: Add child node using policy network guidance
 * 3. Simulation: Rollout with position evaluation
 * 4. Backpropagation: Update visit counts and win rates
 */
export function mctsSearch(
  board: Board,
  player: Player,
  iterations: number = 1000,
  simulationDepth: number = 50
): MoveEvaluation[] {
  const root = createNode(board, player, null, null);
  const policy = policyNetwork(board, player);

  for (let i = 0; i < iterations; i++) {
    let node = root;

    // Selection - traverse tree using UCT
    while (node.untriedMoves.length === 0 && node.children.size > 0) {
      node = selectBestChild(node);
    }

    // Expansion - add a new child node
    if (node.untriedMoves.length > 0) {
      const move = node.untriedMoves.pop()!;
      const testBoard = [...node.board];
      testBoard[move] = node.player;
      const nextPlayer: Player = node.player === "X" ? "O" : "X";
      const child = createNode(testBoard, nextPlayer, node, move);
      node.children.set(move, child);
      node = child;
    }

    // Simulation (Rollout)
    const result = rollout(node.board, node.player, simulationDepth);

    // Backpropagation
    backpropagate(node, result);
  }

  // Compile results for each move
  const evaluations: MoveEvaluation[] = [];
  for (const [move, child] of root.children) {
    const policyScore = policy.get(move) || 0;
    const valueScore = child.visits > 0 ? child.wins / child.visits : 0.5;
    const confidence =
      0.4 * policyScore + 0.4 * valueScore + 0.2 * (child.visits / iterations);

    evaluations.push({
      position: move,
      policyScore,
      valueScore,
      visitCount: child.visits,
      confidence: Math.min(1, confidence),
    });
  }

  // Sort by confidence (best first)
  evaluations.sort((a, b) => b.confidence - a.confidence);

  return evaluations;
}

/**
 * Select best child using UCT formula:
 * UCT = wins/visits + C * sqrt(log(parent_visits) / visits)
 *
 * The exploration constant C controls how much we favor exploration.
 * AlphaGo uses a similar formula with their policy prior.
 */
function selectBestChild(node: MCTSNode): MCTSNode {
  const C = Math.SQRT2; // Exploration constant

  let bestChild: MCTSNode | null = null;
  let bestScore = -Infinity;

  for (const child of node.children.values()) {
    if (child.visits === 0) return child; // Always visit unvisited nodes first

    const exploitation = child.wins / child.visits;
    const exploration = C * Math.sqrt(Math.log(node.visits) / child.visits);
    const score = exploitation + exploration;

    if (score > bestScore) {
      bestScore = score;
      bestChild = child;
    }
  }

  return bestChild!;
}

/**
 * Rollout: simulate a random game from the current position.
 * Uses the value network to evaluate the final position.
 */
function rollout(board: Board, currentPlayer: Player, maxDepth: number): number {
  let currentBoard = [...board];
  let player = currentPlayer;
  let depth = 0;

  while (depth < maxDepth) {
    const { winner } = checkWinner(currentBoard);
    if (winner) return winner === "X" ? 1 : -1;
    if (isBoardFull(currentBoard)) return 0;

    const moves = getAvailableMoves(currentBoard);
    // Use a smart rollout policy (not purely random)
    const move = smartRolloutMove(currentBoard, moves, player);
    currentBoard[move] = player;
    player = player === "X" ? "O" : "X";
    depth++;
  }

  // Use value network for depth-limited evaluation
  return valueNetwork(currentBoard, "X") * 2 - 1; // Convert 0-1 to -1..1
}

/**
 * Smart rollout move selection.
 * Favors winning/blocking moves during rollout (like AlphaGo's rollout policy).
 */
function smartRolloutMove(board: Board, moves: number[], player: Player): number {
  const opponent: Player = player === "X" ? "O" : "X";

  for (const move of moves) {
    // Win immediately
    const testBoard = [...board];
    testBoard[move] = player;
    if (checkWinner(testBoard).winner === player) return move;
  }

  for (const move of moves) {
    // Block opponent win
    const testBoard = [...board];
    testBoard[move] = opponent;
    if (checkWinner(testBoard).winner === opponent) return move;
  }

  // Weighted random (prefer center/corners)
  const weights = moves.map((m) => POSITION_WEIGHTS[m] + 0.1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < moves.length; i++) {
    r -= weights[i];
    if (r <= 0) return moves[i];
  }
  return moves[moves.length - 1];
}

/**
 * Backpropagate simulation result up the tree.
 */
function backpropagate(node: MCTSNode, result: number): void {
  let current: MCTSNode | null = node;
  let player = node.player;

  while (current) {
    current.visits++;
    // If result indicates X won and this node's parent was played by X, it's a win
    if (player === "X") {
      current.wins += (result + 1) / 2; // Convert -1..1 to 0..1
    } else {
      current.wins += (1 - result) / 2; // Flip for O
    }
    player = player === "X" ? "O" : "X";
    current = current.parent;
  }
}

// ─── AI Move Selection ─────────────────────────────────────────────────────

/**
 * Get the best move for the AI player using MCTS.
 */
export function getAIMove(
  board: Board,
  aiPlayer: Player = "O",
  difficulty: "easy" | "medium" | "hard" | "alpha" = "alpha"
): { move: number; evaluations: MoveEvaluation[] } {
  const iterations =
    difficulty === "easy" ? 50 :
    difficulty === "medium" ? 200 :
    difficulty === "hard" ? 500 :
    1500; // "alpha" difficulty

  const evaluations = mctsSearch(board, aiPlayer, iterations);

  if (evaluations.length === 0) {
    // Shouldn't happen, but fallback
    const moves = getAvailableMoves(board);
    return { move: moves[0], evaluations: [] };
  }

  // For easy mode, add some randomness
  if (difficulty === "easy" && Math.random() < 0.3) {
    const randomIdx = Math.floor(Math.random() * evaluations.length);
    return { move: evaluations[randomIdx].position, evaluations };
  }

  // For medium, sometimes take second-best
  if (difficulty === "medium" && Math.random() < 0.15 && evaluations.length > 1) {
    return { move: evaluations[1].position, evaluations };
  }

  // Alpha mode: always pick the best
  return { move: evaluations[0].position, evaluations };
}
