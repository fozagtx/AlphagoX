"use client";

import type { Board, MoveEvaluation } from "@/lib/ai-engine";

interface GameBoardProps {
  board: Board;
  onCellClick: (position: number) => void;
  winLine: number[] | null;
  status: string;
  evaluations: MoveEvaluation[];
  isThinking: boolean;
  showEval: boolean;
  lastMove: number | null;
}

export default function GameBoard({
  board,
  onCellClick,
  winLine,
  status,
  evaluations,
  isThinking,
  showEval,
  lastMove,
}: GameBoardProps) {
  const playable = status === "playing" && !isThinking;

  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.02] p-1.5">
      {board.map((cell, position) => {
        const evaluation = evaluations.find((item) => item.position === position);
        const isEmpty = cell === null;
        const isWinning = winLine?.includes(position) ?? false;

        return (
          <button
            key={position}
            type="button"
            aria-label={`square ${position}${cell ? `, ${cell}` : ", empty"}`}
            onClick={() => onCellClick(position)}
            disabled={!isEmpty || !playable}
            className={`group relative flex h-24 w-24 items-center justify-center rounded-xl border text-5xl font-semibold transition sm:h-28 sm:w-28 ${
              isWinning
                ? "border-amber-300/40 bg-amber-300/10"
                : "border-white/5 bg-white/[0.03]"
            } ${
              isEmpty && playable
                ? "cursor-pointer hover:border-violet-400/40 hover:bg-violet-400/5"
                : "cursor-default"
            } ${cell === "X" ? "text-emerald-300" : cell === "O" ? "text-rose-300" : "text-white/15"}`}
          >
            {showEval && isEmpty && evaluation && status === "playing" && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl bg-violet-400/15 transition-[height] duration-500"
                style={{ height: `${Math.round(evaluation.confidence * 100)}%` }}
              />
            )}

            {cell ? (
              <span
                className={`relative animate-[pop_0.2s_ease-out] ${
                  lastMove === position ? "drop-shadow-[0_0_14px_currentColor]" : ""
                }`}
              >
                {cell}
              </span>
            ) : (
              <span className="relative font-mono text-xs text-white/20 group-hover:text-white/40">
                {position}
              </span>
            )}

            {showEval && isEmpty && evaluation && status === "playing" && (
              <span className="absolute right-1.5 top-1.5 font-mono text-[10px] text-violet-200/70">
                {Math.round(evaluation.confidence * 100)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
