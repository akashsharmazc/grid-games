import { useState, useCallback, useTransition, useDeferredValue } from 'react';
import type { Mode, TTTCell, MemoryState, TTTScore, PersistedSnapshot } from '../types';
import { MIN_N, MAX_N } from '../constants';
import { clamp } from '../utils';

export function useGameState() {
  const [isPending, startTransition] = useTransition();
  
  // Core game state
  const [n, _setN] = useState<number>(3);
  const [mode, setMode] = useState<Mode>("grid");
  const [grid, setGrid] = useState<(boolean | TTTCell)[]>(Array(9).fill(false));
  const [focusIndex, setFocusIndex] = useState(0);

  // TicTacToe state
  const [currentPlayer, setCurrentPlayer] = useState<TTTCell>("X");

  // Memory game state
  const [mem, setMem] = useState<MemoryState>({
    pattern: [],
    revealStep: -1,
    isRevealing: false,
    inputIndex: 0,
    level: 1,
    score: 0,
    dailySeedOn: true,
  });

  // Deferred values for expensive computations
  const deferredGrid = useDeferredValue(grid);
  const deferredN = useDeferredValue(n);

  // Optimized setters that use transitions for non-urgent updates
  const setN = useCallback((next: number) => {
    const newN = clamp(next, MIN_N, MAX_N);
    startTransition(() => {
      _setN(newN);
      setGrid(Array(newN * newN).fill(mode === "tictactoe" ? "" : false));
      if (mode === "tictactoe" && newN !== 3) setMode("grid");
      if (mode === "memory")
        setMem((m) => ({ ...m, pattern: [], inputIndex: 0, isRevealing: false }));
      setFocusIndex(0);
    });
  }, [mode]);

  const setModeSafe = useCallback((m: Mode) => {
    startTransition(() => {
      if (m === "tictactoe") _setN(3);
      setMode(m);
      const size = m === "tictactoe" ? 3 : n;
      setGrid(Array(size * size).fill(m === "tictactoe" ? "" : false));
      if (m === "tictactoe") setCurrentPlayer("X");
      if (m === "memory")
        setMem((prev) => ({ ...prev, inputIndex: 0, pattern: [], isRevealing: false }));
    });
  }, [n]);

  // Optimized grid update with batched state changes
  const updateGrid = useCallback((updater: (grid: (boolean | TTTCell)[]) => (boolean | TTTCell)[]) => {
    setGrid(updater);
  }, []);

  // Create snapshot for persistence
  const createSnapshot = useCallback((): PersistedSnapshot => ({
    version: 1,
    n: deferredN,
    mode,
    theme: 'light', // This will be handled by theme hook
    grid: deferredGrid,
    currentPlayer: mode === "tictactoe" ? currentPlayer : undefined,
    memory: mode === "memory" ? mem : undefined,
  }), [deferredN, mode, deferredGrid, currentPlayer, mem]);

  // Restore from snapshot
  const restoreSnapshot = useCallback((snapshot: PersistedSnapshot) => {
    startTransition(() => {
      _setN(clamp(snapshot.n, MIN_N, MAX_N));
      setMode(snapshot.mode);
      
      const total = snapshot.n * snapshot.n;
      const newGrid = new Array(total).fill(snapshot.mode === "tictactoe" ? "" : false);
      for (let i = 0; i < Math.min(total, snapshot.grid.length); i++) {
        newGrid[i] = snapshot.grid[i];
      }
      setGrid(newGrid);
      
      if (snapshot.mode === "tictactoe" && snapshot.currentPlayer) {
        setCurrentPlayer(snapshot.currentPlayer);
      }
      if (snapshot.mode === "memory" && snapshot.memory) {
        setMem(snapshot.memory);
      }
    });
  }, []);

  return {
    // State
    n: deferredN,
    mode,
    grid: deferredGrid,
    focusIndex,
    currentPlayer,
    mem,
    isPending,
    
    // Setters
    setN,
    setMode: setModeSafe,
    setGrid,
    setFocusIndex,
    setCurrentPlayer,
    setMem,
    updateGrid,
    
    // Utilities
    createSnapshot,
    restoreSnapshot,
  };
}
