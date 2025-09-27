import { memo } from 'react';
import type { GameStatusProps } from '../types';

export const GameStatus = memo<GameStatusProps>(({
  mode,
  currentPlayer,
  tttScore,
  memoryState,
  onMemoryAction,
  onMemorySettingChange
}) => {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Mode info */}
      <div className="rounded-2xl p-3" style={{ background: "var(--panel)" }}>
        <p className="text-xs text-[color:var(--muted)]">Mode</p>
        <p className="text-sm font-semibold capitalize">{mode}</p>
      </div>

      {/* TicTacToe status */}
      {mode === "tictactoe" && tttScore && (
        <div className="rounded-2xl p-3" style={{ background: "var(--panel)" }}>
          <p className="text-xs text-[color:var(--muted)]">Turn</p>
          <p className="text-sm font-semibold">
            {currentPlayer ? `${currentPlayer}'s turn` : "Game Over"}
          </p>
          <div className="mt-2 flex gap-3 text-xs">
            <span>X: <b>{tttScore.X}</b></span>
            <span>O: <b>{tttScore.O}</b></span>
            <span>Draws: <b>{tttScore.Draws}</b></span>
          </div>
        </div>
      )}

      {/* Memory game status */}
      {mode === "memory" && memoryState && (
        <div className="rounded-2xl p-3" style={{ background: "var(--panel)" }}>
          <p className="text-xs text-[color:var(--muted)]">Memory</p>
          <p className="text-sm font-semibold">
            Level {memoryState.level} · Score {memoryState.score}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={memoryState.dailySeedOn}
                onChange={(e) => onMemorySettingChange?.(e.target.checked)}
              />
              Daily Seeded Challenge
            </label>
            <button
              onClick={() => onMemoryAction?.(memoryState.pattern.length > 0 ? 'replay' : 'start')}
              className="rounded-lg border border-gray-300/30 px-2 py-1 hover:brightness-110"
            >
              {memoryState.pattern.length ? "Replay Pattern" : "Start Round"}
            </button>
          </div>
        </div>
      )}

      {/* Status display */}
      <div className="rounded-2xl p-3" style={{ background: "var(--panel)" }}>
        <p className="text-xs text-[color:var(--muted)]">Status</p>
        <div aria-live="polite" className="text-sm font-medium" />
      </div>
    </div>
  );
});

GameStatus.displayName = 'GameStatus';
