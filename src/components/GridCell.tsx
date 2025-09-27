import React, { memo, useCallback } from 'react';
import { type GridCellProps } from '../types';

// Memoized grid cell component to prevent unnecessary re-renders
export const GridCell = memo<GridCellProps>(({
  index,
  value,
  isFocused,
  mode,
  memoryState,
  onClick,
  onFocus
}) => {
  // Stable click handler to prevent recreation on every render
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    
    // Optimized ripple effect without causing layout thrashing
    el.classList.remove("rippling");
    // Use requestAnimationFrame instead of offsetWidth for better performance
    requestAnimationFrame(() => {
      el.classList.add("rippling");
    });
    
    onClick(index, e);
  }, [index, onClick]);

  const handleFocus = useCallback(() => {
    onFocus(index);
  }, [index, onFocus]);

  // Generate accessibility label
  let label = "";
  if (mode === "grid") label = (value ? "On" : "Off") + ` cell ${index + 1}`;
  if (mode === "tictactoe") label = ((value as string) || "Empty") + ` at cell ${index + 1}`;
  if (mode === "memory") label = (value ? "Selected" : "Empty") + ` cell ${index + 1}`;

  return (
    <button
      role="gridcell"
      aria-label={label}
      onClick={handleClick}
      onFocus={handleFocus}
      className={[
        "relative aspect-square rounded-2xl transition-transform duration-150 focus:outline-none",
        "tile3d ripple-btn",
        isFocused ? "focus-ring is-focused" : "",
        value ? "tile-on" : "tile",
      ].join(" ")}
    >
      <div className="flex h-full w-full items-center justify-center text-3xl font-black">
        {mode === "tictactoe" ? (value as string) : ""}
      </div>

      {/* Memory game reveal animation */}
      {mode === "memory" && 
       memoryState.isRevealing && 
       memoryState.pattern[memoryState.revealStep] === index && (
        <div
          className="absolute inset-0 animate-pulse rounded-2xl"
          style={{ background: "var(--accent)", opacity: 0.3 }}
        />
      )}
    </button>
  );
});

GridCell.displayName = 'GridCell';
