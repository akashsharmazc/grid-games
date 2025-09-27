import { useEffect, useCallback } from 'react';
import { rc, idx } from '../utils';

interface KeyboardHandlers {
  onSelect?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onArrow?: (dir: "up" | "down" | "left" | "right") => void;
}

export function useKeyboardNavigation(
  handlers: KeyboardHandlers,
  focusIndex: number,
  n: number,
  setFocusIndex: (index: number) => void
) {
  const handleArrowKey = useCallback((dir: "up" | "down" | "left" | "right") => {
    const { r, c } = rc(focusIndex, n);
    let newIndex = focusIndex;
    
    switch (dir) {
      case "up":
        newIndex = idx((r - 1 + n) % n, c, n);
        break;
      case "down":
        newIndex = idx((r + 1) % n, c, n);
        break;
      case "left":
        newIndex = idx(r, (c - 1 + n) % n, n);
        break;
      case "right":
        newIndex = idx(r, (c + 1) % n, n);
        break;
    }
    
    setFocusIndex(newIndex);
  }, [focusIndex, n, setFocusIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      
      if (mod && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        handlers.onUndo?.();
        return;
      }
      
      if (mod && (e.key === "y" || (e.shiftKey && (e.key === "Z" || e.key === "z")))) {
        e.preventDefault();
        handlers.onRedo?.();
        return;
      }
      
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handlers.onSelect?.();
        return;
      }
      
      // Arrow key navigation
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          handleArrowKey("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          handleArrowKey("down");
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleArrowKey("left");
          break;
        case "ArrowRight":
          e.preventDefault();
          handleArrowKey("right");
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers, handleArrowKey]);
}
