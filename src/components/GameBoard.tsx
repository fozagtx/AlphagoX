"use client";

import { useEffect, useRef } from "react";
import type { Board, Player, MoveEvaluation } from "@/lib/ai-engine";

interface GameBoardProps {
  board: Board;
  onCellClick: (position: number) => void;
  winLine: number[] | null;
  status: string;
  currentPlayer: Player;
  evaluations: MoveEvaluation[];
  isThinking: boolean;
  showEval: boolean;
}

export default function GameBoard({
  board,
  onCellClick,
  winLine,
  status,
  currentPlayer,
  evaluations,
  isThinking,
  showEval,
}: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);

  // Get confidence for a position from evaluations
  const getEval = (pos: number) => evaluations.find((e) => e.position === pos);

  const isWinCell = (pos: number) => winLine?.includes(pos) ?? false;

  const getStatusText = () => {
    if (status === "X_wins") return "You win! 🎉";
    if (status === "O_wins") return "AI wins! 🧠";
    if (status === "draw") return "Draw — well played!";
    if (isThinking) return "AI is thinking...";
    if (currentPlayer === "X") return "Your turn (X)";
    return "AI's turn (O)";
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Status */}
      <div className="text-center">
        <div
          className={`text-2xl font-bold tracking-tight ${
            status === "X_wins"
              ? "text-emerald-400"
              : status === "O_wins"
                ? "text-red-400"
                : status === "draw"
                  ? "text-amber-400"
                  : isThinking
                    ? "text-purple-400 animate-pulse"
                    : "text-zinc-200"
          }`}
        >
          {getStatusText()}
        </div>
        {isThinking && (
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
          </div>
        )}
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        className="relative grid grid-cols-3 gap-2 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-2xl shadow-purple-500/5"
      >
        {board.map((cell, i) => {
          const eval_ = getEval(i);
          const win = isWinCell(i);
          const isEmpty = !cell;

          return (
            <button
              key={i}
              onClick={() => isEmpty && status === "playing" && onCellClick(i)}
              disabled={!isEmpty || status !== "playing"}
              className={`
                relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl
                flex items-center justify-center
                text-5xl sm:text-6xl font-black
                transition-all duration-200
                ${isEmpty && status === "playing"
                  ? "bg-zinc-800/50 hover:bg-zinc-700/60 hover:scale-105 cursor-pointer border border-zinc-700/50 hover:border-purple-500/50"
                  : "bg-zinc-800/30 cursor-default border border-zinc-800/50"
                }
                ${win ? "ring-2 ring-amber-400/80 bg-amber-500/10" : ""}
                ${cell === "X" ? "text-emerald-400" : cell === "O" ? "text-red-400" : ""}
              `}
            >
              {/* Evaluation overlay */}
              {showEval && isEmpty && eval_ && status === "playing" && (
                <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-purple-500/20 transition-all duration-500"
                    style={{ height: `${eval_.confidence * 100}%` }}
                  />
                  <div className="absolute top-1 right-1.5 text-[10px] font-mono text-purple-300/70">
                    {Math.round(eval_.confidence * 100)}
                  </div>
                </div>
              )}

              {/* Cell content with animation */}
              {cell && (
                <span
                  className={`
                    relative z-10
                    animate-[pop_0.3s_ease-out]
                    ${win ? "drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]" : ""}
                  `}
                >
                  {cell}
                </span>
              )}

              {/* Hover hint for empty cells */}
              {isEmpty && status === "playing" && (
                <span className="absolute inset-0 flex items-center justify-center text-zinc-600 text-3xl opacity-0 hover:opacity-50 transition-opacity pointer-events-none">
                  +
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Position guide */}
      <div className="text-xs text-zinc-600 font-mono">
        Positions: 0,1,2 (top) · 3,4,5 (mid) · 6,7,8 (bot)
      </div>
    </div>
  );
}
