"use client";

import type { Board, GameStatus, Player } from "@/lib/ai-engine";

interface MinimapProps {
  board: Board;
  winLine: number[] | null;
  currentPlayer: Player;
  status: GameStatus;
  moveCount: number;
  lastMove: number | null;
}

const STATUS_LABEL: Record<GameStatus, string> = {
  playing: "in play",
  X_wins: "X wins",
  O_wins: "O wins",
  draw: "draw",
};

export default function Minimap({
  board,
  winLine,
  currentPlayer,
  status,
  moveCount,
  lastMove,
}: MinimapProps) {
  return (
    <section className="border-b border-white/5 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">Minimap</h2>
        <span className="font-mono text-[10px] text-white/30">move {moveCount}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="grid w-[84px] shrink-0 grid-cols-3 gap-[3px] rounded-lg border border-white/10 bg-black/40 p-[3px]">
          {board.map((cell, position) => (
            <div
              key={position}
              className={`flex aspect-square items-center justify-center rounded-[3px] text-[11px] font-semibold ${
                winLine?.includes(position)
                  ? "bg-amber-300/20 text-amber-200"
                  : lastMove === position
                    ? "bg-violet-400/20"
                    : "bg-white/[0.04]"
              } ${cell === "X" ? "text-emerald-300" : cell === "O" ? "text-rose-300" : "text-white/15"}`}
            >
              {cell ?? ""}
            </div>
          ))}
        </div>

        <dl className="min-w-0 flex-1 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-white/40">status</dt>
            <dd
              className={`font-mono ${
                status === "playing"
                  ? "text-white/70"
                  : status === "X_wins"
                    ? "text-emerald-300"
                    : status === "O_wins"
                      ? "text-rose-300"
                      : "text-amber-300"
              }`}
            >
              {STATUS_LABEL[status]}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-white/40">to move</dt>
            <dd className="font-mono text-white/70">
              {status === "playing" ? `${currentPlayer} ${currentPlayer === "X" ? "(you)" : "(engine)"}` : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-white/40">last</dt>
            <dd className="font-mono text-white/70">{lastMove === null ? "—" : `square ${lastMove}`}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
