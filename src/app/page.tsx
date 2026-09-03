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
import Minimap from "@/components/Minimap";
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

/** MCTS is stochastic, so evaluations are only rendered after hydration. */
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
  const [showEval, setShowEval] = useState(true);

  const [tools, setTools] = useState<ToolRegistration[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const { board, currentPlayer, status, winLine, history, lastMove } = game;

  // ─── Engine ────────────────────────────────────────────────────────────

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

  // ─── Actions ───────────────────────────────────────────────────────────

  const playSquare = useCallback((position: number) => {
    dispatch({ type: "move", position, mark: "X" });
  }, []);

  const undoMove = useCallback(() => {
    dispatch({ type: "undo" });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  // ─── WebMCP ────────────────────────────────────────────────────────────

  // WebMCP tools are registered once and read live state through this ref.
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

  // ─── Render ────────────────────────────────────────────────────────────

  const headline =
    status === "X_wins"
      ? "You win"
      : status === "O_wins"
        ? "Engine wins"
        : status === "draw"
          ? "Draw"
          : isThinking
            ? "Engine thinking…"
            : currentPlayer === "X"
              ? "Your turn"
              : "Engine to move";

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-white/5 bg-black/30 lg:h-screen lg:w-[340px] lg:border-r">
        <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-[13px] text-violet-300">
            ⬡
          </span>
          <span className="flex-1">
            <span className="block text-[13px] font-semibold tracking-tight text-white/90">AlphagoX</span>
            <span className="block font-mono text-[10px] text-white/35">mcts tic tac toe</span>
          </span>
        </div>

        <Minimap
          board={board}
          winLine={winLine}
          currentPlayer={currentPlayer}
          status={status}
          moveCount={history.length}
          lastMove={lastMove}
        />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col items-center gap-8 px-6 py-10 lg:h-screen lg:overflow-y-auto">
        <div className="flex w-full max-w-xl items-baseline justify-between">
          <h1 className={`text-xl font-semibold tracking-tight ${isThinking ? "text-violet-300" : "text-white/90"}`}>
            {headline}
          </h1>
          <span className="font-mono text-[11px] text-white/30">{difficulty}</span>
        </div>

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

        <div className="w-full max-w-xl space-y-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">Engine</h2>
              <span className="text-[10px] text-white/30">{DIFFICULTY_BLURBS[difficulty]}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {DIFFICULTIES.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`rounded-lg px-3 py-2 text-[11px] font-medium transition ${
                    difficulty === level
                      ? "bg-violet-500/90 text-white"
                      : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ControlButton onClick={undoMove} disabled={history.length === 0}>
              undo
            </ControlButton>
            <ControlButton onClick={resetGame}>new game</ControlButton>
            <ControlButton onClick={() => setShowEval((value) => !value)} active={showEval}>
              evaluation overlay
            </ControlButton>
            <ControlButton onClick={() => setEngineAutoPlay((value) => !value)} active={engineAutoPlay}>
              engine auto-play
            </ControlButton>
          </div>

          <ToolsPanel
            tools={tools}
            isSupported={isSupported}
            isRegistered={isRegistered}
            onRegister={registerTools}
            onUnregister={unregisterTools}
          />
        </div>
      </main>
    </div>
  );
}

function ControlButton({
  onClick,
  disabled,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 text-[11px] transition disabled:opacity-30 ${
        active
          ? "border-violet-400/30 bg-violet-400/10 text-violet-200"
          : "border-white/5 bg-white/[0.02] text-white/55 hover:border-white/10 hover:text-white/85"
      }`}
    >
      {children}
    </button>
  );
}
