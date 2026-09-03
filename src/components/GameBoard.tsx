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

const PIECE_SIZE = { base: "text-4xl", sm: "sm:text-5xl", md: "md:text-6xl" };
const CELL_SIZE = { base: "h-20 w-20", sm: "sm:h-24 sm:w-24", md: "md:h-28 md:w-28" };

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
    <div className="board-shadow mx-auto">
      <div className="ambient-glow" />

      {/* Board frame — polished wood-look surface */}
      <div className="rounded-2xl border-2 border-[#3a3a3a] bg-[#1a1a1a] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]">
        {/* Inner inset border */}
        <div className="rounded-xl border border-white/[0.04] bg-gradient-to-b from-[#222] to-[#1a1a1a] p-2">
          {/* 3×3 grid */}
          <div className="grid grid-cols-3 gap-2">
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
                  className={`
                    cell-inset relative flex items-center justify-center
                    rounded-lg font-bold transition-all duration-200
                    ${CELL_SIZE.base} ${CELL_SIZE.sm} ${CELL_SIZE.md}
                    ${PIECE_SIZE.base} ${PIECE_SIZE.sm} ${PIECE_SIZE.md}
                    ${isWinning
                      ? "bg-gradient-to-b from-[#2a2a1a] to-[#1a1a10] border border-[#c9a84c]/30 animate-[winPulse_2s_ease-in-out_infinite]"
                      : "bg-gradient-to-b from-[#262626] to-[#1e1e1e] border border-[#333]"
                    }
                    ${isEmpty && playable
                      ? "cursor-pointer hover:from-[#2e2e2e] hover:to-[#242424] hover:border-[#c9a84c]/40 hover:shadow-[0_0_20px_rgba(201,168,76,0.08)]"
                      : "cursor-default"
                    }
                  `}
                >
                  {/* Cell ambient highlight */}
                  {!cell && playable && (
                    <span className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-b from-white/[0.02] to-transparent" />
                  )}

                  {/* Evaluation bar */}
                  {showEval && isEmpty && evaluation && status === "playing" && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-1 bottom-1 rounded-md bg-gradient-to-t from-[#c9a84c]/20 to-transparent transition-[height] duration-500"
                      style={{ height: `${Math.round(evaluation.confidence * 100)}%` }}
                    />
                  )}

                  {/* Piece */}
                  {cell ? (
                    <span
                      className={`
                        relative select-none
                        ${cell === "X" ? "x-piece" : "o-piece"}
                        ${lastMove === position ? "drop-shadow-[0_0_10px_currentColor]" : ""}
                      `}
                    >
                      {cell}
                    </span>
                  ) : (
                    <span className="relative select-none font-mono text-xs text-white/10 group-hover:text-white/25 transition-colors">
                      {position}
                    </span>
                  )}

                  {/* Evaluation number */}
                  {showEval && isEmpty && evaluation && status === "playing" && (
                    <span className="absolute right-1.5 top-1.5 font-mono text-[10px] text-[#c9a84c]/50">
                      {Math.round(evaluation.confidence * 100)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}