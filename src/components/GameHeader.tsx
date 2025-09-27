import { memo } from 'react';
import type { GameHeaderProps } from '../types';
import { THEMES, MIN_N, MAX_N } from '../constants';
import { ShareButton } from './ShareButton';

export const GameHeader = memo<GameHeaderProps>(({
  mode,
  theme,
  n,
  onModeChange,
  onThemeChange,
  onSizeChange,
  onReset,
  onUndo,
  onRedo,
  onShare
}) => {
  return (
    <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div 
          className="rounded-2xl px-3 py-1 text-xs font-semibold" 
          style={{ background: "var(--panel)" }}
        >
          Grid Games
        </div>
        <span className="text-sm text-[color:var(--muted)]">
          Dynamic Grid · TTT · Memory
        </span>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        {/* Mode selector */}
        <select
          aria-label="Mode"
          value={mode}
          onChange={(e) => onModeChange(e.target.value as any)}
          className="rounded-xl border border-gray-300/30 bg-[color:var(--panel)] px-3 py-2 text-sm outline-none hover:brightness-110"
        >
          <option value="grid">Free Grid</option>
          <option value="tictactoe">Tic-Tac-Toe (3×3)</option>
          <option value="memory">Pattern Memory</option>
        </select>

        {/* Size input */}
        <div className="flex items-center gap-1 rounded-xl border border-gray-300/30 bg-[color:var(--panel)] px-2 py-1.5">
          <label className="text-xs text-[color:var(--muted)]">Size</label>
          <input
            type="number"
            min={MIN_N}
            max={MAX_N}
            value={n}
            onChange={(e) => onSizeChange(parseInt(e.target.value || "3", 10))}
            disabled={mode === "tictactoe"}
            className="w-16 rounded-md bg-transparent px-2 py-1 text-sm outline-none"
          />
        </div>

        {/* Theme selector */}
        <select
          aria-label="Theme"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value as any)}
          className="rounded-xl border border-gray-300/30 bg-[color:var(--panel)] px-3 py-2 text-sm outline-none hover:brightness-110"
        >
          {THEMES.map((t) => (
            <option key={t} value={t}>
              {t.replace("-", " ")}
            </option>
          ))}
        </select>

        {/* Action buttons */}
        <button
          onClick={onReset}
          className="rounded-xl bg-[color:var(--panel)] px-3 py-2 text-sm shadow hover:brightness-110 active:scale-[.98]"
        >
          Reset
        </button>

        <button
          onClick={onUndo}
          className="rounded-xl bg-[color:var(--panel)] px-3 py-2 text-sm shadow hover:brightness-110 active:scale-[.98]"
        >
          Undo
        </button>
        
        <button
          onClick={onRedo}
          className="rounded-xl bg-[color:var(--panel)] px-3 py-2 text-sm shadow hover:brightness-110 active:scale-[.98]"
        >
          Redo
        </button>

        <ShareButton getUrl={onShare} />
      </div>
    </header>
  );
});

GameHeader.displayName = 'GameHeader';
