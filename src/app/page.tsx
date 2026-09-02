"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  createEmptyBoard,
  getGameState,
  getAIMove as computeAIMove,
  type Board,
  type Player,
  type MoveEvaluation,
} from "@/lib/ai-engine";
import {
  registerWebMCPTools,
  unregisterAllTools,
  type ToolRegistration,
} from "@/lib/webmcp-tools";
import GameBoard from "@/components/GameBoard";
import ToolsPanel from "@/components/ToolsPanel";

// ─── Agent Log Entry ───────────────────────────────────────────────────────

interface LogEntry {
  id: number;
  time: string;
  source: "agent" | "system" | "user";
  message: string;
}

// ─── Page Component ────────────────────────────────────────────────────────

export default function Home() {
  // Game state
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X");
  const [status, setStatus] = useState<string>("playing");
  const [moveHistory, setMoveHistory] = useState<{ player: Player; position: number }[]>([]);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [difficulty, setDifficultyState] = useState<string>("alpha");
  const [evaluations, setEvaluations] = useState<MoveEvaluation[]>([]);
  const [showEval, setShowEval] = useState(true);
  const [isThinking, setIsThinking] = useState(false);

  // WebMCP state
  const [tools, setTools] = useState<ToolRegistration[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Agent log
  const [log, setLog] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const logId = useRef(0);

  // State getter for WebMCP tools
  const getState = useCallback(() => ({
    board,
    currentPlayer,
    status,
    moveHistory,
    difficulty,
  }), [board, currentPlayer, status, moveHistory, difficulty]);

  const addLog = useCallback((source: LogEntry["source"], message: string) => {
    logId.current++;
    const entry: LogEntry = {
      id: logId.current,
      time: new Date().toLocaleTimeString("en-US", { hour12: false }),
      source,
      message,
    };
    setLog((prev) => [...prev.slice(-50), entry]);
  }, []);

  // Scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  // ─── Game Actions ──────────────────────────────────────────────────────

  const playMove = useCallback(
    (pos: number): boolean => {
      if (board[pos] || status !== "playing" || currentPlayer !== "X") return false;

      const newBoard = [...board];
      newBoard[pos] = "X";
      const state = getGameState(newBoard);

      setBoard(newBoard);
      setCurrentPlayer(state.currentPlayer);
      setStatus(state.status);
      setMoveHistory((prev) => [...prev, { player: "X", position: pos }]);
      setWinLine(state.winLine);
      addLog("user", `Placed X at position ${pos}`);

      // Compute evaluations for display
      if (state.status === "playing") {
        const evals = computeAIMove(newBoard, "O", difficulty as "easy" | "medium" | "hard" | "alpha");
        setEvaluations(evals.evaluations);
      }

      return true;
    },
    [board, status, currentPlayer, difficulty, addLog]
  );

  const getAIMoveAction = useCallback(() => {
    if (status !== "playing" || currentPlayer !== "O") return null;
    return computeAIMove(board, "O", difficulty as "easy" | "medium" | "hard" | "alpha");
  }, [board, currentPlayer, status, difficulty]);

  const undoMove = useCallback((): boolean => {
    if (moveHistory.length < 2) return false;
    // Undo last two moves (human + AI response)
    const newHistory = moveHistory.slice(0, -2);
    const newBoard = createEmptyBoard();
    for (const entry of newHistory) {
      newBoard[entry.position] = entry.player;
    }
    setBoard(newBoard);
    setMoveHistory(newHistory);
    setCurrentPlayer("X");
    setStatus("playing");
    setWinLine(null);
    setEvaluations([]);
    addLog("system", "Undid last move pair");
    return true;
  }, [moveHistory, addLog]);

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard());
    setCurrentPlayer("X");
    setStatus("playing");
    setMoveHistory([]);
    setWinLine(null);
    setEvaluations([]);
    setIsThinking(false);
    addLog("system", "Game reset");
  }, [addLog]);

  const setDifficulty = useCallback(
    (d: string) => {
      setDifficultyState(d);
      addLog("system", `Difficulty set to ${d}`);
    },
    [addLog]
  );

  // ─── AI Auto-Play ─────────────────────────────────────────────────────

  useEffect(() => {
    if (status !== "playing" || currentPlayer !== "O" || isThinking) return;

    let cancelled = false;
    setIsThinking(true);

    // Simulate brief "thinking" delay (200-600ms based on difficulty)
    const delay = difficulty === "easy" ? 200 : difficulty === "medium" ? 300 : difficulty === "hard" ? 500 : 700;

    const timer = setTimeout(() => {
      if (cancelled) return;

      const result = computeAIMove(board, "O", difficulty as "easy" | "medium" | "hard" | "alpha");
      if (!result) { setIsThinking(false); return; }

      const newBoard = [...board];
      newBoard[result.move] = "O";
      const state = getGameState(newBoard);

      setBoard(newBoard);
      setCurrentPlayer(state.currentPlayer);
      setStatus(state.status);
      setMoveHistory((prev) => [...prev, { player: "O", position: result.move }]);
      setWinLine(state.winLine);
      setEvaluations(result.evaluations);
      setIsThinking(false);
      addLog("agent", `AI placed O at position ${result.move} (confidence: ${Math.round(result.evaluations[0]?.confidence * 100 || 0)}%)`);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [board, currentPlayer, status, difficulty, isThinking, addLog]);

  // ─── Human Click Handler ──────────────────────────────────────────────

  const handleCellClick = useCallback(
    (pos: number) => {
      if (isThinking) return;
      playMove(pos);
    },
    [isThinking, playMove]
  );

  // ─── WebMCP Registration ──────────────────────────────────────────────

  const handleRegister = useCallback(async () => {
    addLog("system", "Registering WebMCP tools...");
    const registry = await registerWebMCPTools(getState, (updater) => {
      const updates = updater(getState());
      if (updates.board) setBoard(updates.board);
      if (updates.currentPlayer) setCurrentPlayer(updates.currentPlayer);
      if (updates.status) setStatus(updates.status);
      if (updates.difficulty) setDifficultyState(updates.difficulty);
    }, {
      playMove,
      undoMove,
      resetGame,
      setDifficulty,
      getAIMove: getAIMoveAction,
      getEvaluations: () => evaluations,
    });

    setTools([...registry.tools]);
    setIsSupported(registry.isSupported);
    setIsRegistered(registry.isRegistered);

    const count = registry.tools.filter((t) => t.status === "registered").length;
    addLog("system", `Registered ${count}/${registry.tools.length} tools`);
  }, [getState, playMove, undoMove, resetGame, setDifficulty, getAIMoveAction, evaluations, addLog]);

  const handleUnregister = useCallback(async () => {
    const registry = { tools, isSupported, isRegistered };
    await unregisterAllTools(registry);
    setIsRegistered(false);
    setTools((prev) => prev.map((t) => ({ ...t, status: "pending" as const })));
    addLog("system", "All WebMCP tools unregistered");
  }, [tools, isSupported, isRegistered, addLog]);

  // Auto-register on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleRegister();
    }, 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-purple-500/25">
              ⬡
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">WebMCP Go</h1>
              <p className="text-[10px] text-zinc-500 font-mono">agent-ready tic tac toe</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50">
              <div className={`w-1.5 h-1.5 rounded-full ${isRegistered ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
              <span className="text-[10px] font-mono text-zinc-400">
                {isRegistered ? "WebMCP Active" : "WebMCP Pending"}
              </span>
            </div>
            <a
              href="https://developer.chrome.com/docs/ai/webmcp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              docs ↗
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Game Controls */}
          <div className="lg:col-span-3 space-y-4">
            {/* Difficulty */}
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                AI Difficulty
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {(["easy", "medium", "hard", "alpha"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    disabled={isThinking}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      difficulty === d
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                        : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200"
                    }`}
                  >
                    {d === "alpha" ? "⬡ Alpha" : d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-600 mt-3 leading-relaxed">
                {difficulty === "easy" && "50 MCTS iterations — beginner friendly"}
                {difficulty === "medium" && "200 iterations — basic strategy"}
                {difficulty === "hard" && "500 iterations — strong play"}
                {difficulty === "alpha" && "1500 iterations — AlphaGo-level MCTS"}
              </p>
            </div>

            {/* Actions */}
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 space-y-2">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Actions
              </h3>
              <button
                onClick={undoMove}
                disabled={moveHistory.length < 2 || isThinking}
                className="w-full px-3 py-2.5 rounded-lg text-xs font-medium bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↩ Undo Last Move
              </button>
              <button
                onClick={resetGame}
                className="w-full px-3 py-2.5 rounded-lg text-xs font-medium bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 transition-colors"
              >
                ↻ New Game
              </button>
              <button
                onClick={() => setShowEval(!showEval)}
                className="w-full px-3 py-2.5 rounded-lg text-xs font-medium bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 transition-colors"
              >
                {showEval ? "◯ Hide AI Eval" : "◉ Show AI Eval"}
              </button>
            </div>

            {/* Stats */}
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Game Stats
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Moves played</span>
                  <span className="text-zinc-300 font-mono">{moveHistory.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">X wins</span>
                  <span className="text-emerald-400 font-mono">{log.filter((l) => l.message.includes("win")).length || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">AI (O) wins</span>
                  <span className="text-red-400 font-mono">{log.filter((l) => l.message.includes("win")).length || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Difficulty</span>
                  <span className="text-zinc-300 font-mono">{difficulty}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Game Board */}
          <div className="lg:col-span-5 flex items-start justify-center">
            <GameBoard
              board={board}
              onCellClick={handleCellClick}
              winLine={winLine}
              status={status}
              currentPlayer={currentPlayer}
              evaluations={evaluations}
              isThinking={isThinking}
              showEval={showEval}
            />
          </div>

          {/* Right: WebMCP Tools + Agent Log */}
          <div className="lg:col-span-4 space-y-4">
            <ToolsPanel
              tools={tools}
              isSupported={isSupported}
              isRegistered={isRegistered}
              onRegister={handleRegister}
              onUnregister={handleUnregister}
            />

            {/* Agent Activity Log */}
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Agent Activity
                </h3>
                <span className="text-[10px] font-mono text-zinc-600">{log.length} events</span>
              </div>
              <div
                ref={logRef}
                className="h-64 overflow-y-auto px-5 py-2 space-y-1 font-mono text-[11px]"
              >
                {log.length === 0 ? (
                  <div className="text-zinc-600 text-center py-8">
                    Agent activity will appear here...
                  </div>
                ) : (
                  log.map((entry) => (
                    <div key={entry.id} className="flex gap-2 leading-relaxed">
                      <span className="text-zinc-700 flex-shrink-0">{entry.time}</span>
                      <span
                        className={`flex-shrink-0 ${
                          entry.source === "agent"
                            ? "text-purple-400"
                            : entry.source === "user"
                              ? "text-emerald-400"
                              : "text-zinc-500"
                        }`}
                      >
                        {entry.source === "agent" ? "◆" : entry.source === "user" ? "○" : "·"}
                      </span>
                      <span className="text-zinc-400">{entry.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* WebMCP Explainer */}
        <div className="mt-12 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-zinc-200 mb-4">How WebMCP Works Here</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-zinc-400 leading-relaxed">
            <div>
              <div className="text-purple-400 font-semibold mb-2">1. Register Tools</div>
              <p>
                This page calls{" "}
                <code className="text-xs font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">
                  document.modelContext.registerTool()
                </code>{" "}
                to expose 9 structured tools — play_move, get_game_state, get_ai_move, evaluate_position,
                reset_game, and more. Each tool has a JSON schema for its inputs and outputs.
              </p>
            </div>
            <div>
              <div className="text-purple-400 font-semibold mb-2">2. Agent Discovers</div>
              <p>
                Any browser AI agent (ChatGPT, Gemini, Claude) visiting this page can discover
                the registered tools. The agent sees the tool names, descriptions, and schemas — no
                DOM scraping needed. It knows exactly what actions are available.
              </p>
            </div>
            <div>
              <div className="text-purple-400 font-semibold mb-2">3. Agent Executes</div>
              <p>
                The agent calls tools by name with structured inputs. For example, it can call{" "}
                <code className="text-xs font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">
                  play_move({"{position: 4}"})
                </code>{" "}
                to place a mark, or{" "}
                <code className="text-xs font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">
                  get_ai_move()
                </code>{" "}
                to see what the AI recommends. Tools execute visibly in the page.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between text-[10px] text-zinc-600">
          <span>WebMCP Go — AlphaGo-inspired Tic Tac Toe with Agent Tools</span>
          <span>
            Built with WebMCP Imperative API · MCTS + Policy/Value Networks
          </span>
        </div>
      </footer>
    </div>
  );
}
