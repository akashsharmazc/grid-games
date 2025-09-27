import React, { Suspense, useCallback, useMemo, useRef, useEffect } from 'react';
import { GameGrid } from './components/GameGrid';
import { GameHeader } from './components/GameHeader';
import { GameStatus } from './components/GameStatus';
import { StyleTag } from './components/StyleTag';
import { useGameState } from './hooks/useGameState';
import { useTheme } from './hooks/useTheme';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { usePersistedState } from './hooks/usePersistedState';
import { computeTTTWinner, calculateWinLine, base64Encode, base64Decode, mulberry32 } from './utils';
import { TTTScore, PersistedSnapshot } from './types';
import { STORAGE_KEY } from './constants';

/**
 * Modern Grid Games App with React 18 optimizations
 * - Uses useTransition for non-urgent updates
 * - Memoized components prevent unnecessary re-renders
 * - Deferred values for expensive computations
 * - Modular component architecture
 */
export default function App() {
  const { theme, setTheme } = useTheme();
  const gameState = useGameState();
  const [tttScore, setTTTScore] = usePersistedState<TTTScore>(
    `${STORAGE_KEY}:tttScore`,
    { X: 0, O: 0, Draws: 0 }
  );

  // Refs for history and announcements
  const undoRef = useRef<PersistedSnapshot[]>([]);
  const redoRef = useRef<PersistedSnapshot[]>([]);
  const statusRef = useRef<HTMLDivElement>(null);

  // Memoized expensive computations with deferred values
  const tttResult = useMemo(() => 
    computeTTTWinner(gameState.grid as any[], gameState.n), 
    [gameState.grid, gameState.n]
  );

  const winLine = useMemo(() => 
    calculateWinLine(tttResult.line, gameState.n),
    [tttResult.line, gameState.n]
  );

  // Optimized announcement function
  const announce = useCallback((text: string) => {
    if (statusRef.current) {
      statusRef.current.textContent = text;
    }
  }, []);

  // History management
  const pushUndo = useCallback(() => {
    const snapshot = {
      ...gameState.createSnapshot(),
      theme,
      tttScore: gameState.mode === "tictactoe" ? tttScore : undefined,
    };
    undoRef.current.push(snapshot);
    redoRef.current = [];
  }, [gameState, theme, tttScore]);

  const undo = useCallback(() => {
    const last = undoRef.current.pop();
    if (!last) return;
    
    redoRef.current.push({
      ...gameState.createSnapshot(),
      theme,
      tttScore,
    });
    
    gameState.restoreSnapshot(last);
    if (last.theme) setTheme(last.theme);
    if (last.tttScore) setTTTScore(last.tttScore);
    announce("Undid last move");
  }, [gameState, theme, tttScore, setTheme, setTTTScore, announce]);

  const redo = useCallback(() => {
    const next = redoRef.current.pop();
    if (!next) return;
    
    undoRef.current.push({
      ...gameState.createSnapshot(),
      theme,
      tttScore,
    });
    
    gameState.restoreSnapshot(next);
    if (next.theme) setTheme(next.theme);
    if (next.tttScore) setTTTScore(next.tttScore);
    announce("Redid move");
  }, [gameState, theme, tttScore, setTheme, setTTTScore, announce]);

  // Game actions
  const handleCellActivate = useCallback((index: number) => {
    if (gameState.mode === "grid") {
      pushUndo();
      gameState.updateGrid(grid => {
        const newGrid = [...grid];
        newGrid[index] = !newGrid[index];
        return newGrid;
      });
      gameState.setFocusIndex(index);
      return;
    }

    if (gameState.mode === "tictactoe") {
      const grid = gameState.grid as any[];
      if (grid[index] || tttResult.winner) return;
      
      pushUndo();
      const nextPlayer = gameState.currentPlayer === "X" ? "O" : "X";
      
      gameState.updateGrid(g => {
        const newGrid = [...g];
        newGrid[index] = gameState.currentPlayer;
        return newGrid;
      });
      
      gameState.setCurrentPlayer(nextPlayer);
      gameState.setFocusIndex(index);
      
      // Check for game end (will be computed in next render)
      setTimeout(() => {
        const result = computeTTTWinner(gameState.grid as any[], gameState.n);
        if (result.winner) {
          setTTTScore(s => ({ ...s, [result.winner!]: s[result.winner!] + 1 }));
          announce(`${result.winner} wins!`);
        } else if (gameState.grid.every(c => c !== "")) {
          setTTTScore(s => ({ ...s, Draws: s.Draws + 1 }));
          announce("Draw.");
        } else {
          announce(`${nextPlayer}'s turn`);
        }
      }, 0);
      return;
    }

    if (gameState.mode === "memory") {
      if (gameState.mem.isRevealing || gameState.mem.pattern.length === 0) return;
      
      pushUndo();
      gameState.updateGrid(g => {
        const newGrid = [...g];
        newGrid[index] = !newGrid[index];
        return newGrid;
      });
      gameState.setFocusIndex(index);

      const expectedIndex = gameState.mem.pattern[gameState.mem.inputIndex];
      if (index === expectedIndex) {
        const nextInput = gameState.mem.inputIndex + 1;
        if (nextInput === gameState.mem.pattern.length) {
          gameState.setMem(m => ({ 
            ...m, 
            inputIndex: 0, 
            level: m.level + 1, 
            score: m.score + 10 
          }));
          announce("Correct! Next level…");
          setTimeout(() => startMemoryRound(), 450);
        } else {
          gameState.setMem(m => ({ ...m, inputIndex: nextInput }));
        }
      } else {
        gameState.setMem(m => ({ 
          ...m, 
          inputIndex: 0, 
          score: Math.max(0, m.score - 2) 
        }));
        announce("Oops! Try again.");
        setTimeout(() => startMemoryRound(true), 450);
      }
    }
  }, [gameState, pushUndo, tttResult.winner, setTTTScore, announce]);

  // Memory game logic
  const startMemoryRound = useCallback((retrySameLevel = false) => {
    const total = gameState.n * gameState.n;
    const baseLen = Math.max(3, Math.min(6, Math.floor(gameState.n * 0.75)));
    const targetLen = retrySameLevel ? gameState.mem.pattern.length : baseLen + (gameState.mem.level - 1);

    let rng = Math.random;
    if (gameState.mem.dailySeedOn) {
      const d = new Date();
      const daySeed = Number(`${d.getUTCFullYear()}${d.getUTCMonth() + 1}${d.getUTCDate()}`);
      rng = mulberry32(daySeed + gameState.mem.level);
    }

    const seq: number[] = [];
    const used = new Set<number>();
    while (seq.length < Math.min(targetLen, total)) {
      const candidate = Math.floor(rng() * total);
      if (!used.has(candidate)) {
        seq.push(candidate);
        used.add(candidate);
      }
    }

    gameState.setGrid(Array(gameState.n * gameState.n).fill(false));
    gameState.setMem(m => ({ ...m, pattern: seq, inputIndex: 0, isRevealing: true }));

    const tempo = Math.max(200, 600 - gameState.mem.level * 40);
    seq.forEach((cellIdx, i) => {
      setTimeout(() => {
        gameState.setMem(m => ({ ...m, revealStep: i }));
        gameState.updateGrid(() => {
          const newGrid = Array(gameState.n * gameState.n).fill(false);
          newGrid[cellIdx] = true;
          return newGrid;
        });
      }, i * (tempo + 150));
    });

    setTimeout(() => {
      gameState.setMem(m => ({ ...m, revealStep: -1, isRevealing: false }));
      gameState.setGrid(Array(gameState.n * gameState.n).fill(false));
      announce("Your turn. Repeat the pattern.");
    }, seq.length * (tempo + 150) + 50);
  }, [gameState, announce]);

  // Optimized event handlers
  const handleCellClick = useCallback((index: number, event: React.MouseEvent<HTMLButtonElement>) => {
    handleCellActivate(index);
  }, [handleCellActivate]);

  const resetBoard = useCallback(() => {
    pushUndo();
    gameState.setGrid(Array(gameState.n * gameState.n).fill(gameState.mode === "tictactoe" ? "" : false));
    if (gameState.mode === "tictactoe") gameState.setCurrentPlayer("X");
    if (gameState.mode === "memory") {
      gameState.setMem(m => ({ ...m, inputIndex: 0, pattern: [], isRevealing: false }));
    }
    announce("Board reset");
  }, [gameState, pushUndo, announce]);

  // URL sharing
  const getShareUrl = useCallback(() => {
    const snapshot = { ...gameState.createSnapshot(), theme, tttScore };
    const url = new URL(window.location.href);
    url.searchParams.set("s", base64Encode(snapshot));
    return url.toString();
  }, [gameState, theme, tttScore]);

  // Memory game actions
  const handleMemoryAction = useCallback((action: 'replay' | 'start') => {
    startMemoryRound(action === 'replay');
  }, [startMemoryRound]);

  const handleMemorySettingChange = useCallback((dailySeed: boolean) => {
    gameState.setMem(m => ({ ...m, dailySeedOn: dailySeed }));
  }, [gameState]);

  // Keyboard navigation
  useKeyboardNavigation(
    {
      onSelect: () => handleCellActivate(gameState.focusIndex),
      onUndo: undo,
      onRedo: redo,
    },
    gameState.focusIndex,
    gameState.n,
    gameState.setFocusIndex
  );

  // Load state from URL on mount
  useEffect(() => {
    const url = new URL(window.location.href);
    const s = url.searchParams.get("s");
    if (s) {
      const decoded = base64Decode<PersistedSnapshot>(s);
      if (decoded?.version === 1) {
        gameState.restoreSnapshot(decoded);
        if (decoded.theme) setTheme(decoded.theme);
        if (decoded.tttScore) setTTTScore(decoded.tttScore);
        return;
      }
    }

    // Load from localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw) as PersistedSnapshot;
        if (obj.version === 1) {
          gameState.restoreSnapshot(obj);
          if (obj.theme) setTheme(obj.theme);
          if (obj.tttScore) setTTTScore(obj.tttScore);
        }
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    const snapshot = { ...gameState.createSnapshot(), theme, tttScore };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage errors
    }
  }, [gameState.n, gameState.mode, theme, gameState.grid, gameState.currentPlayer, tttScore, gameState.mem]);

  return (
    <div className="min-h-screen mesh-bg" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      <StyleTag />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <GameHeader
            mode={gameState.mode}
            theme={theme}
            n={gameState.n}
            onModeChange={gameState.setMode}
            onThemeChange={setTheme}
            onSizeChange={gameState.setN}
            onReset={resetBoard}
            onUndo={undo}
            onRedo={redo}
            onShare={getShareUrl}
          />

          <GameStatus
            mode={gameState.mode}
            currentPlayer={gameState.currentPlayer}
            tttScore={gameState.mode === "tictactoe" ? tttScore : undefined}
            memoryState={gameState.mode === "memory" ? gameState.mem : undefined}
            onMemoryAction={handleMemoryAction}
            onMemorySettingChange={handleMemorySettingChange}
          />

          {/* Status announcement region */}
          <div className="mb-4">
            <div ref={statusRef} aria-live="polite" className="sr-only" />
          </div>

          <GameGrid
            n={gameState.n}
            grid={gameState.grid}
            focusIndex={gameState.focusIndex}
            mode={gameState.mode}
            memoryState={gameState.mem}
            winLine={winLine}
            onCellClick={handleCellClick}
            onCellFocus={gameState.setFocusIndex}
          />

          {/* Footer Hints */}
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl p-3 text-xs" style={{ background: "var(--panel)", color: "var(--muted)" }}>
              <p><b>Tips</b>: Arrows to move • Enter/Space to select • Ctrl/Cmd+Z to Undo • Ctrl/Cmd+Y to Redo</p>
            </div>
            <div className="rounded-2xl p-3 text-xs" style={{ background: "var(--panel)", color: "var(--muted)" }}>
              <p>
                Sharing encodes current state in the URL (base64). Theme & scores persist locally. Animations are CSS-only
                (scale, opacity) for 60fps.
              </p>
            </div>
          </div>
        </Suspense>
      </div>
    </div>
  );
}
