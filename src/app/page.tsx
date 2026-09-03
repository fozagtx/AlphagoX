"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import GameBoard from "@/components/GameBoard";
import ToolsPanel from "@/components/ToolsPanel";
import {
  createEmptyBoard,
  getAIMove,
  getGameState,
  type Board,
  type GameStatus,
  type MoveEvaluation,
  type Player,
} from "@/lib/ai-engine";
import { DIFFICULTIES, DIFFICULTY_BLURBS, type Difficulty } from "@/lib/game-tools";
import {
  registerWebMCPTools,
  unregisterAllTools,
  type ToolRegistration,
} from "@/lib/webmcp-tools";

interface Move {
  player: Exclude<Player, null>;
  position: number;
}

interface Game {
  board: Board;
  currentPlayer: Player;
  status: GameStatus;
  winLine: number[] | null;
  history: Move[];
  lastMove: number | null;
}

type GameEvent =
  | { type: "move"; position: number; mark: Exclude<Player, null> }
  | { type: "undo" }
  | { type: "reset" };

function initialGame(): Game {
  return {
    board: createEmptyBoard(),
    currentPlayer: "X",
    status: "playing",
    winLine: null,
    history: [],
    lastMove: null,
  };
}

function fromHistory(history: Move[]): Game {
  const board = createEmptyBoard();
  for (const move of history) board[move.position] = move.player;
  const state = getGameState(board);
  return {
    board,
    currentPlayer: state.currentPlayer,
    status: state.status,
    winLine: state.winLine,
    history,
    lastMove: history.at(-1)?.position ?? null,
  };
}

const noopSubscribe = () => () => {};

function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

function gameReducer(game: Game, event: GameEvent): Game {
  switch (event.type) {
    case "move": {
      if (game.status !== "playing") return game;
      if (game.board[event.position] !== null) return game;
      if (game.currentPlayer !== event.mark) return game;
      return fromHistory([...game.history, { player: event.mark, position: event.position }]);
    }
    case "undo":
      return game.history.length === 0 ? game : fromHistory(game.history.slice(0, -1));
    case "reset":
      return initialGame();
  }
}

export default function Home() {
  const [game, dispatch] = useReducer(gameReducer, undefined, initialGame);
  const [difficulty, setDifficulty] = useState<Difficulty>("alpha");
  const [engineAutoPlay, setEngineAutoPlay] = useState(true);
  const [showEval, setShowEval] = useState(false);

  const [tools, setTools] = useState<ToolRegistration[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const { board, currentPlayer, status, winLine, history, lastMove } = game;

  const isThinking = engineAutoPlay && status === "playing" && currentPlayer === "O";

  useEffect(() => {
    if (!isThinking) return;
    const timer = setTimeout(() => {
      const { move } = getAIMove(board, "O", difficulty);
      dispatch({ type: "move", position: move, mark: "O" });
    }, 350);
    return () => clearTimeout(timer);
  }, [board, difficulty, isThinking]);

  const isClient = useIsClient();

  const evaluations = useMemo<MoveEvaluation[]>(() => {
    if (!isClient || !showEval || status !== "playing" || currentPlayer === null) return [];
    return getAIMove(board, currentPlayer, difficulty).evaluations;
  }, [isClient, board, currentPlayer, status, difficulty, showEval]);

  const playSquare = useCallback((position: number) => {
    dispatch({ type: "move", position, mark: "X" });
  }, []);

  const undoMove = useCallback(() => {
    dispatch({ type: "undo" });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  // ─── WebMCP ────────────────────────────────────────────────────────

  const liveState = useRef({ game, difficulty, evaluations });
  useEffect(() => {
    liveState.current = { game, difficulty, evaluations };
  }, [game, difficulty, evaluations]);

  const registerTools = useCallback(async () => {
    const registry = await registerWebMCPTools(
      () => {
        const current = liveState.current;
        return {
          board: current.game.board,
          currentPlayer: current.game.currentPlayer,
          status: current.game.status,
          moveHistory: current.game.history,
          difficulty: current.difficulty,
        };
      },
      () => undefined,
      {
        playMove: (position) => {
          dispatch({ type: "move", position, mark: "X" });
          return true;
        },
        undoMove: () => {
          dispatch({ type: "undo" });
          return true;
        },
        resetGame: () => dispatch({ type: "reset" }),
        setDifficulty: (value) => setDifficulty(value as Difficulty),
        getAIMove: () =>
          getAIMove(liveState.current.game.board, "O", liveState.current.difficulty),
        getEvaluations: () => liveState.current.evaluations,
      }
    );
    setTools([...registry.tools]);
    setIsSupported(registry.isSupported);
    setIsRegistered(registry.isRegistered);
  }, []);

  const unregisterTools = useCallback(async () => {
    await unregisterAllTools({ tools, isSupported, isRegistered });
    setIsRegistered(false);
    setTools((previous) => previous.map((tool) => ({ ...tool, status: "pending" as const })));
  }, [tools, isSupported, isRegistered]);

  useEffect(() => {
    void registerTools();
  }, [registerTools]);

  const statusText =
    status === "X_wins" ? "You win"
    : status === "O_wins" ? "Engine wins"
    : status === "draw" ? "Draw"
    : isThinking ? "Engine thinking…"
    : currentPlayer === "X" ? "Your turn"
    : "Engine to move";

  const statusColor =
    status === "X_wins" ? "text-[#3da55e]"
    : status === "O_wins" ? "text-[#f5f0e8]"
    : status === "draw" ? "text-[#c9a84c]"
    : isThinking ? "text-[#c9a84c]"
    : "text-[#8b7355]";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
      {/* Background decorative elements */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Window light */}
        <div className="absolute right-[10%] top-0 h-[60%] w-[35%] bg-gradient-to-b from-white/[0.06] to-transparent rounded-b-[100px]" />
        {/* Shelf */}
        <div className="absolute right-[5%] top-[30%] h-[6px] w-[25%] bg-[#5a3a20]/60 rounded shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
        {/* Plant silhouette */}
        <div className="absolute right-[6%] top-[5%] text-[80px] opacity-[0.04] select-none">🌿</div>
        {/* Lamp glow */}
        <div className="absolute left-[8%] top-[25%] h-[120px] w-[120px] rounded-full bg-[#e8d0a0]/[0.04] blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-6">
        {/* Status bar */}
        <div className="flex items-center gap-4 rounded-full bg-white/10 px-5 py-2 backdrop-blur-sm border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <span className={`text-sm font-semibold tracking-wide ${statusColor} transition-colors duration-300`}>
            {statusText}
          </span>
          <span className="h-4 w-px bg-white/10" />
          <span className="font-mono text-[11px] text-[#8b7355]">move {history.length}</span>
          <span className="h-4 w-px bg-white/10" />
          <span className="font-mono text-[11px] text-[#8b7355]">{difficulty}</span>
        </div>

        {/* Game Board */}
        <GameBoard
          board={board}
          onCellClick={playSquare}
          winLine={winLine}
          status={status}
          evaluations={evaluations}
          isThinking={isThinking}
          showEval={showEval}
          lastMove={lastMove}
        />

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-white/10 px-5 py-3 backdrop-blur-sm border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <button
            type="button"
            onClick={undoMove}
            disabled={history.length === 0}
            className="rounded-lg bg-white/[0.06] px-3.5 py-2 text-[11px] font-medium text-[#8b7355] transition hover:bg-white/[0.12] hover:text-[#5a4a35] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={resetGame}
            className="rounded-lg bg-white/[0.06] px-3.5 py-2 text-[11px] font-medium text-[#8b7355] transition hover:bg-white/[0.12] hover:text-[#5a4a35]"
          >
            New Game
          </button>
          <span className="h-5 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => setShowEval((v) => !v)}
            className={`rounded-lg px-3.5 py-2 text-[11px] font-medium transition ${
              showEval
                ? "bg-[#c9a84c]/20 text-[#c9a84c]"
                : "bg-white/[0.06] text-[#8b7355] hover:bg-white/[0.12]"
            }`}
          >
            Eval
          </button>
          <button
            type="button"
            onClick={() => setEngineAutoPlay((v) => !v)}
            className={`rounded-lg px-3.5 py-2 text-[11px] font-medium transition ${
              engineAutoPlay
                ? "bg-[#c9a84c]/20 text-[#c9a84c]"
                : "bg-white/[0.06] text-[#8b7355] hover:bg-white/[0.12]"
            }`}
          >
            Auto
          </button>
          <span className="h-5 w-px bg-white/10" />
          {DIFFICULTIES.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setDifficulty(level)}
              className={`rounded-lg px-3 py-2 text-[11px] font-medium transition ${
                difficulty === level
                  ? "bg-[#c9a84c]/20 text-[#c9a84c] ring-1 ring-[#c9a84c]/30"
                  : "bg-white/[0.06] text-[#8b7355] hover:bg-white/[0.12] hover:text-[#5a4a35]"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* ToolsPanel */}
        <div className="w-full max-w-md">
          <ToolsPanel
            tools={tools}
            isSupported={isSupported}
            isRegistered={isRegistered}
            onRegister={registerTools}
            onUnregister={unregisterTools}
          />
        </div>

        {/* Brand */}
        <div className="mt-2 text-center">
          <h1 className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#8b7355]/60">
            AlphagoX
          </h1>
          <p className="mt-1 font-mono text-[9px] text-[#8b7355]/40">
            mcts tic tac toe · webmcp
          </p>
        </div>
      </div>
    </div>
  );
}