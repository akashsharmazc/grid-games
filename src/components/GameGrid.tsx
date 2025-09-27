import React, { memo, useMemo } from 'react';
import { GridCell } from './GridCell';
import type { Mode, TTTCell, MemoryState } from '../types';
import { calculateWinLine } from '../utils';

interface GameGridProps {
  n: number;
  grid: (boolean | TTTCell)[];
  focusIndex: number;
  mode: Mode;
  memoryState: MemoryState;
  winLine?: { x1: number; y1: number; x2: number; y2: number } | null;
  onCellClick: (index: number, event?: React.MouseEvent<HTMLButtonElement>) => void;
  onCellFocus: (index: number) => void;
}

export const GameGrid = memo<GameGridProps>(({
  n,
  grid,
  focusIndex,
  mode,
  memoryState,
  winLine,
  onCellClick,
  onCellFocus
}) => {
  // Memoize grid cells array to prevent recreation
  const gridCells = useMemo(() => 
    Array.from({ length: n * n }, (_, i) => ({
      index: i,
      value: grid[i],
      isFocused: focusIndex === i,
    })),
    [n, grid, focusIndex]
  );

  return (
    <div className="relative">
      {/* Neon grid backdrop */}
      <div
        className="neon-grid"
        style={{ 
          borderRadius: 24, 
          "--cell": `calc(min(92vw,640px) / ${n})` 
        } as React.CSSProperties}
      />

      {/* Grid container */}
      <div
        className="mx-auto grid max-w-[min(92vw,640px)] select-none"
        style={{
          gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
          gap: "8px",
        }}
        role="grid"
        aria-label={`Game grid ${n} by ${n}`}
      >
        {gridCells.map(({ index, value, isFocused }) => (
          <GridCell
            key={index}
            index={index}
            value={value}
            isFocused={isFocused}
            mode={mode}
            memoryState={memoryState}
            onClick={onCellClick}
            onFocus={onCellFocus}
          />
        ))}
      </div>

      {/* TicTacToe win line */}
      {mode === "tictactoe" && winLine && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: "min(92vw,640px)", height: "min(92vw,640px)" }}
        >
          <svg viewBox={`0 0 ${n} ${n}`} className="h-full w-full">
            <line
              x1={winLine.x1}
              y1={winLine.y1}
              x2={winLine.x2}
              y2={winLine.y2}
              stroke="var(--accent)"
              strokeWidth={0.1}
              strokeLinecap="round"
              className="draw-line"
            />
          </svg>
        </div>
      )}
    </div>
  );
});

GameGrid.displayName = 'GameGrid';
