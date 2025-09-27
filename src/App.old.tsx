import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Grid Games — single-file React + TSX app
 * (Fixed build error + visual uniqueness + sanity tests)
 *
 * What changed in this revision
 * - Removed the `as const` on THEMES (caused a TS/JS parse error in some sandboxes)
 * - Cleaned up a duplicated CSS block that leaked outside <StyleTag/>
 * - Tightened types (tuple return from usePersistedState)
 * - Added a small runtime test suite (console.assert) to catch regressions
 * - Kept the neon/glassy visuals and ripple effects
 */

// ---------- Constants ----------
const MIN_N = 3;
const MAX_N = 8;
const STORAGE_KEY = "grid-games.v1";
const THEME_KEY = "grid-games.theme";

// NOTE: Avoid `as const` here for broader sandbox compatibility.
const THEMES: string[] = ["light", "dark", "playful", "high-contrast"];
type Theme = "light" | "dark" | "playful" | "high-contrast";

type Mode = "grid" | "tictactoe" | "memory";

type TTTCell = "" | "X" | "O";

// ---------- Helpers ----------
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const idx = (row: number, col: number, n: number) => row * n + col;
const rc = (i: number, n: number) => ({ r: Math.floor(i / n), c: i % n });

function usePersistedState<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

function base64Encode(obj: any) {
  const s = JSON.stringify(obj);
  if (typeof window === "undefined") return s;
  return btoa(unescape(encodeURIComponent(s)));
}
function base64Decode<T>(str: string): T | null {
  try {
    const s = decodeURIComponent(escape(atob(str)));
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function useKeyboardShortcuts(handlers: {
  onSelect?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onArrow?: (dir: "up" | "down" | "left" | "right") => void;
}) {
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
      if (e.key === "ArrowUp") handlers.onArrow?.("up");
      if (e.key === "ArrowDown") handlers.onArrow?.("down");
      if (e.key === "ArrowLeft") handlers.onArrow?.("left");
      if (e.key === "ArrowRight") handlers.onArrow?.("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers.onSelect, handlers.onUndo, handlers.onRedo, handlers.onArrow]);
}

// deterministic PRNG for Memory (seeded daily challenge)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Game Logic ----------
function computeTTTWinner(cells: TTTCell[], n: number) {
  if (n !== 3) return { winner: "" as TTTCell, line: null as null | number[] };
  const lines: number[][] = [];
  for (let r = 0; r < n; r++) lines.push([idx(r, 0, n), idx(r, 1, n), idx(r, 2, n)]);
  for (let c = 0; c < n; c++) lines.push([idx(0, c, n), idx(1, c, n), idx(2, c, n)]);
  lines.push([idx(0, 0, n), idx(1, 1, n), idx(2, 2, n)]);
  lines.push([idx(0, 2, n), idx(1, 1, n), idx(2, 0, n)]);
  for (const L of lines) {
    const [a, b, c] = L;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return { winner: cells[a], line: L };
    }
  }
  return { winner: "" as TTTCell, line: null as null | number[] };
}

// ---------- Types for App State ----------
interface MemoryState {
  pattern: number[]; // sequence to reproduce
  revealStep: number; // index currently revealed
  isRevealing: boolean;
  inputIndex: number; // next expected index in pattern
  level: number; // difficulty level
  score: number; // total score
  dailySeedOn: boolean; // if true, use daily seed
}

interface TTTScore {
  X: number;
  O: number;
  Draws: number;
}

interface PersistedSnapshot {
  version: 1;
  n: number;
  mode: Mode;
  theme: Theme;
  grid: (boolean | TTTCell)[]; // depending on mode
  currentPlayer?: TTTCell;
  tttScore?: TTTScore;
  memory?: MemoryState;
}

// ---------- Main Component ----------
export default function App() {
  const [theme, setTheme] = usePersistedState<Theme>(THEME_KEY, "light");
  const [n, _setN] = useState<number>(3);
  const [mode, setMode] = useState<Mode>("grid");
  const [grid, setGrid] = useState<(boolean | TTTCell)[]>(Array(3 * 3).fill(false));
  const [focusIndex, setFocusIndex] = useState(0);

  // TicTacToe state
  const [currentPlayer, setCurrentPlayer] = useState<TTTCell>("X");
  const [tttScore, setTTTScore] = usePersistedState<TTTScore>(
    STORAGE_KEY + ":tttScore",
    { X: 0, O: 0, Draws: 0 }
  );

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

  // Undo/Redo stacks (store snapshots)
  const undoRef = useRef<PersistedSnapshot[]>([]);
  const redoRef = useRef<PersistedSnapshot[]>([]);

  const statusRef = useRef<HTMLDivElement>(null); // aria-live region

  // ---------- Theming (CSS variables) ----------
  useEffect(() => {
    const root = document.documentElement;
    const map: Record<Theme, Record<string, string>> = {
      light: {
        "--bg": "#f7f7fb",
        "--panel": "#ffffff",
        "--fg": "#111827",
        "--muted": "#6b7280",
        "--primary": "#2563eb",
        "--accent": "#22c55e",
        "--warn": "#ef4444",
        "--tile": "#eef2ff",
        "--tile-on": "#c7d2fe",
        "--glow": "rgba(37, 99, 235, 0.25)",
      },
      dark: {
        "--bg": "#0b1020",
        "--panel": "#0f172a",
        "--fg": "#e5e7eb",
        "--muted": "#9ca3af",
        "--primary": "#60a5fa",
        "--accent": "#34d399",
        "--warn": "#f87171",
        "--tile": "#111827",
        "--tile-on": "#1f2937",
        "--glow": "rgba(96, 165, 250, 0.3)",
      },
      playful: {
        "--bg": "linear-gradient(135deg, #fff1f2, #eff6ff)",
        "--panel": "#ffffffaa",
        "--fg": "#0f172a",
        "--muted": "#475569",
        "--primary": "#a78bfa",
        "--accent": "#f43f5e",
        "--warn": "#ef4444",
        "--tile": "#f5f3ff",
        "--tile-on": "#e9d5ff",
        "--glow": "rgba(167,139,250,0.35)",
      },
      "high-contrast": {
        "--bg": "#000000",
        "--panel": "#000000",
        "--fg": "#ffffff",
        "--muted": "#d1d5db",
        "--primary": "#ffffff",
        "--accent": "#00ff00",
        "--warn": "#ff0033",
        "--tile": "#000000",
        "--tile-on": "#ffffff11",
        "--glow": "rgba(255,255,255,0.4)",
      },
    };
    const vars = map[theme];
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [theme]);

  // ---------- URL <-> State ----------
  function snapshot(): PersistedSnapshot {
    return {
      version: 1,
      n,
      mode,
      theme,
      grid,
      currentPlayer: mode === "tictactoe" ? currentPlayer : undefined,
      tttScore: mode === "tictactoe" ? tttScore : undefined,
      memory: mode === "memory" ? mem : undefined,
    };
  }

  function restore(s: PersistedSnapshot) {
    _setN(clamp(s.n, MIN_N, MAX_N));
    setMode(s.mode);
    setTheme(s.theme);
    setGrid(() => {
      const total = s.n * s.n;
      const arr = new Array(total).fill(s.mode === "tictactoe" ? "" : false);
      for (let i = 0; i < Math.min(total, s.grid.length); i++) arr[i] = s.grid[i];
      return arr;
    });
    if (s.mode === "tictactoe" && s.currentPlayer) setCurrentPlayer(s.currentPlayer);
    if ((s as any).tbtScore) {
      // no-op: backward-compat typo guard; keep for old links
    }
    if (s.tttScore) setTTTScore(s.tttScore);
    if (s.mode === "memory" && s.memory) setMem(s.memory);
  }

  // On mount: decode from URL first, else from localStorage persisted snapshot
  useEffect(() => {
    const url = new URL(window.location.href);
    const s = url.searchParams.get("s");
    if (s) {
      const decoded = base64Decode<PersistedSnapshot>(s);
      if (decoded?.version === 1) {
        restore(decoded);
        return; // do not load LS if URL provided
      }
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw) as PersistedSnapshot;
        if (obj.version === 1) restore(obj);
      }
    } catch {}
  }, []);

  // Persist snapshot to LocalStorage on changes
  useEffect(() => {
    const snap = snapshot();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch {}
  }, [n, mode, theme, grid, currentPlayer, tttScore, mem]);

  // Update URL on demand
  function updateShareUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("s", base64Encode(snapshot()));
    return url.toString();
  }

  // ---------- History (Undo/Redo) ----------
  function pushUndo() {
    undoRef.current.push(snapshot());
    redoRef.current = [];
  }
  function undo() {
    const last = undoRef.current.pop();
    if (!last) return;
    redoRef.current.push(snapshot());
    restore(last);
    announce("Undid last move");
  }
  function redo() {
    const nxt = redoRef.current.pop();
    if (!nxt) return;
    undoRef.current.push(snapshot());
    restore(nxt);
    announce("Redid move");
  }

  // ---------- Helpers per mode ----------
  function setN(next: number) {
    const newN = clamp(next, MIN_N, MAX_N);
    _setN(newN);
    setGrid(Array(newN * newN).fill(mode === "tictactoe" ? "" : false));
    if (mode === "tictactoe" && newN !== 3) setMode("grid");
    if (mode === "memory")
      setMem((m) => ({ ...m, pattern: [], inputIndex: 0, isRevealing: false }));
    setFocusIndex(0);
  }

  function setModeSafe(m: Mode) {
    if (m === "tictactoe") _setN(3);
    setMode(m);
    setGrid(
      Array((m === "tictactoe" ? 3 : n) * (m === "tictactoe" ? 3 : n)).fill(
        m === "tictactoe" ? "" : false
      )
    );
    if (m === "tictactoe") setCurrentPlayer("X");
    if (m === "memory")
      setMem((prev) => ({ ...prev, inputIndex: 0, pattern: [], isRevealing: false }));
  }

  function announce(text: string) {
    if (!statusRef.current) return;
    statusRef.current.textContent = text;
  }

  // ---------- Interactions ----------
  function handleCellActivate(i: number) {
    if (mode === "grid") {
      pushUndo();
      setGrid((g) => {
        const ng = [...g];
        ng[i] = !ng[i] as boolean;
        return ng;
      });
      setFocusIndex(i);
      return;
    }
    if (mode === "tictactoe") {
      const g = grid as TTTCell[];
      if (g[i]) return; // occupied
      const { winner } = computeTTTWinner(g, n);
      if (winner) return; // game over
      pushUndo();
      const next = currentPlayer === "X" ? "O" : "X";
      const ng = [...g];
      ng[i] = currentPlayer;
      setGrid(ng);
      setCurrentPlayer(next);
      const res = computeTTTWinner(ng, n);
      if (res.winner) {
        setTTTScore((s) => ({ ...s, [res.winner!]: s[res.winner!] + 1 }));
        announce(`${res.winner} wins!`);
      } else if (ng.every((c) => c !== "")) {
        setTTTScore((s) => ({ ...s, Draws: s.Draws + 1 }));
        announce("Draw.");
      } else {
        announce(`${next}'s turn`);
      }
      setFocusIndex(i);
      return;
    }
    if (mode === "memory") {
      if (mem.isRevealing || mem.pattern.length === 0) return;
      pushUndo();
      setGrid((g) => {
        const ng = [...g];
        ng[i] = !ng[i] as boolean;
        return ng;
      });
      setFocusIndex(i);

      const expectedIndex = mem.pattern[mem.inputIndex];
      if (i === expectedIndex) {
        const nextInput = mem.inputIndex + 1;
        if (nextInput === mem.pattern.length) {
          setMem((m) => ({ ...m, inputIndex: 0, level: m.level + 1, score: m.score + 10 }));
          announce("Correct! Next level…");
          setTimeout(() => startMemoryRound(), 450);
        } else {
          setMem((m) => ({ ...m, inputIndex: nextInput }));
        }
      } else {
        setMem((m) => ({ ...m, inputIndex: 0, score: Math.max(0, m.score - 2) }));
        announce("Oops! Try again.");
        setTimeout(() => startMemoryRound(true), 450);
      }
    }
  }

  function handleCellClick(i: number, e: React.MouseEvent<HTMLButtonElement>) {
    const el = e.currentTarget;
    el.classList.remove("rippling");
    // flush reflow to restart animation
    // @ts-ignore
    void (el as any).offsetWidth;
    el.classList.add("rippling");
    handleCellActivate(i);
  }

  // Keyboard selection
  useKeyboardShortcuts({
    onSelect: () => handleCellActivate(focusIndex),
    onUndo: undo,
    onRedo: redo,
    onArrow: (dir) => {
      const { r, c } = rc(focusIndex, n);
      if (dir === "up") setFocusIndex(idx((r - 1 + n) % n, c, n));
      if (dir === "down") setFocusIndex(idx((r + 1) % n, c, n));
      if (dir === "left") setFocusIndex(idx(r, (c - 1 + n) % n, n));
      if (dir === "right") setFocusIndex(idx(r, (c + 1) % n, n));
    },
  });

  function resetBoard() {
    pushUndo();
    setGrid(Array(n * n).fill(mode === "tictactoe" ? "" : false));
    if (mode === "tictactoe") setCurrentPlayer("X");
    if (mode === "memory") setMem((m) => ({ ...m, inputIndex: 0, pattern: [], isRevealing: false }));
    announce("Board reset");
  }

  // ---------- Memory Game: sequence generation & reveal ----------
  function startMemoryRound(retrySameLevel = false) {
    const total = n * n;
    const baseLen = Math.max(3, Math.min(6, Math.floor(n * 0.75)));
    const targetLen = retrySameLevel ? mem.pattern.length : baseLen + (mem.level - 1);

    let rng = Math.random;
    if (mem.dailySeedOn) {
      const d = new Date();
      const daySeed = Number(`${d.getUTCFullYear()}${d.getUTCMonth() + 1}${d.getUTCDate()}`);
      rng = mulberry32(daySeed + mem.level);
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

    setGrid(Array(n * n).fill(false));
    setMem((m) => ({ ...m, pattern: seq, inputIndex: 0, isRevealing: true }));

    const tempo = Math.max(200, 600 - mem.level * 40);
    seq.forEach((cellIdx, i) => {
      setTimeout(() => {
        setMem((m) => ({ ...m, revealStep: i }));
        setGrid((g) => {
          const ng = Array(n * n).fill(false);
          ng[cellIdx] = true;
          return ng;
        });
      }, i * (tempo + 150));
    });
    setTimeout(() => {
      setMem((m) => ({ ...m, revealStep: -1, isRevealing: false }));
      setGrid(Array(n * n).fill(false));
      announce("Your turn. Repeat the pattern.");
    }, seq.length * (tempo + 150) + 50);
  }

  // ---------- Derived UI values ----------
  const ttt = useMemo(() => computeTTTWinner(grid as TTTCell[], n), [grid, n]);

  const winLine = useMemo(() => {
    if (!ttt.line) return null as null | { x1: number; y1: number; x2: number; y2: number };
    const step = 1;
    const toCenter = (r: number, c: number) => ({ x: c * step + step / 2, y: r * step + step / 2 });
    const a = rc(ttt.line[0], n);
    const c = rc(ttt.line[2], n);
    const p1 = toCenter(a.r, a.c);
    const p2 = toCenter(c.r, c.c);
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  }, [ttt.line, n]);

  // ---------- Dev Sanity Tests ----------
  useEffect(() => {
    runDevTests();
  }, []);

  // ---------- Render ----------
  return (
    <div className="min-h-screen mesh-bg" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      <StyleTag />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl px-3 py-1 text-xs font-semibold" style={{ background: "var(--panel)" }}>Grid Games</div>
            <span className="text-sm text-[color:var(--muted)]">Dynamic Grid · TTT · Memory</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Mode"
              value={mode}
              onChange={(e) => setModeSafe(e.target.value as Mode)}
              className="rounded-xl border border-gray-300/30 bg-[color:var(--panel)] px-3 py-2 text-sm outline-none hover:brightness-110"
            >
              <option value="grid">Free Grid</option>
              <option value="tictactoe">Tic-Tac-Toe (3×3)</option>
              <option value="memory">Pattern Memory</option>
            </select>

            <div className="flex items-center gap-1 rounded-xl border border-gray-300/30 bg-[color:var(--panel)] px-2 py-1.5">
              <label className="text-xs text-[color:var(--muted)]">Size</label>
              <input
                type="number"
                min={MIN_N}
                max={MAX_N}
                value={n}
                onChange={(e) => setN(parseInt(e.target.value || "3", 10))}
                disabled={mode === "tictactoe"}
                className="w-16 rounded-md bg-transparent px-2 py-1 text-sm outline-none"
              />
            </div>

            <select
              aria-label="Theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              className="rounded-xl border border-gray-300/30 bg-[color:var(--panel)] px-3 py-2 text-sm outline-none hover:brightness-110"
            >
              {THEMES.map((t) => (
                <option key={t} value={t}>{t.replace("-", " ")}</option>
              ))}
            </select>

            <button
              onClick={resetBoard}
              className="rounded-xl bg-[color:var(--panel)] px-3 py-2 text-sm shadow hover:brightness-110 active:scale-[.98]"
            >Reset</button>

            <button
              onClick={undo}
              className="rounded-xl bg-[color:var(--panel)] px-3 py-2 text-sm shadow hover:brightness-110 active:scale-[.98]"
            >Undo</button>
            <button
              onClick={redo}
              className="rounded-xl bg-[color:var(--panel)] px-3 py-2 text-sm shadow hover:brightness-110 active:scale-[.98]"
            >Redo</button>

            <ShareButton getUrl={updateShareUrl} />
          </div>
        </header>

        {/* Score / Status Row */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl p-3" style={{ background: "var(--panel)" }}>
            <p className="text-xs text-[color:var(--muted)]">Mode</p>
            <p className="text-sm font-semibold capitalize">{mode}</p>
          </div>

          {mode === "tictactoe" && (
            <div className="rounded-2xl p-3" style={{ background: "var(--panel)" }}>
              <p className="text-xs text-[color:var(--muted)]">Turn</p>
              <p className="text-sm font-semibold">{ttt.winner ? "Game Over" : currentPlayer}</p>
              <div className="mt-2 flex gap-3 text-xs">
                <span>X: <b>{tttScore.X}</b></span>
                <span>O: <b>{tttScore.O}</b></span>
                <span>Draws: <b>{tttScore.Draws}</b></span>
              </div>
            </div>
          )}

          {mode === "memory" && (
            <div className="rounded-2xl p-3" style={{ background: "var(--panel)" }}>
              <p className="text-xs text-[color:var(--muted)]">Memory</p>
              <p className="text-sm font-semibold">Level {mem.level} · Score {mem.score}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={mem.dailySeedOn}
                    onChange={(e) => setMem((m) => ({ ...m, dailySeedOn: e.target.checked }))}
                  />
                  Daily Seeded Challenge
                </label>
                <button
                  onClick={() => startMemoryRound(mem.pattern.length > 0)}
                  className="rounded-lg border border-gray-300/30 px-2 py-1 hover:brightness-110"
                >{mem.pattern.length ? "Replay Pattern" : "Start Round"}</button>
              </div>
            </div>
          )}

          <div className="rounded-2xl p-3" style={{ background: "var(--panel)" }}>
            <p className="text-xs text-[color:var(--muted)]">Status</p>
            <div ref={statusRef} aria-live="polite" className="text-sm font-medium" />
          </div>
        </div>

        {/* Grid Container */}
        <div className="relative">
          <div
            className="neon-grid"
            style={{ borderRadius: 24, "--cell": `calc(min(92vw,640px) / ${n})` } as React.CSSProperties}
          />

          <div
            className="mx-auto grid max-w-[min(92vw,640px)] select-none"
            style={{
              gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
              gap: "8px",
            }}
            role="grid"
            aria-label={`Game grid ${n} by ${n}`}
          >
            {Array.from({ length: n * n }).map((_, i) => {
              const on = grid[i];
              const isFocus = focusIndex === i;

              let label = "";
              if (mode === "grid") label = (on ? "On" : "Off") + ` cell ${i + 1}`;
              if (mode === "tictactoe") label = ((on as TTTCell) || "Empty") + ` at cell ${i + 1}`;
              if (mode === "memory") label = (on ? "Selected" : "Empty") + ` cell ${i + 1}`;

              return (
                <button
                  key={i}
                  role="gridcell"
                  aria-label={label}
                  onClick={(e) => handleCellClick(i, e)}
                  onFocus={() => setFocusIndex(i)}
                  className={[
                    "relative aspect-square rounded-2xl transition-transform duration-150 focus:outline-none",
                    "tile3d ripple-btn",
                    isFocus ? "focus-ring is-focused" : "",
                    on ? "tile-on" : "tile",
                  ].join(" ")}
                >
                  <div className="flex h-full w-full items-center justify-center text-3xl font-black">
                    {mode === "tictactoe" ? (grid[i] as TTTCell) : ""}
                  </div>

                  {mode === "memory" && mem.isRevealing && mem.pattern[mem.revealStep] === i && (
                    <div
                      className="absolute inset-0 animate-pulse rounded-2xl"
                      style={{ background: "var(--accent)", opacity: 0.3 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {mode === "tictactoe" && ttt.line && (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: "min(92vw,640px)", height: "min(92vw,640px)" }}
            >
              <svg viewBox={`0 0 ${n} ${n}`} className="h-full w-full">
                <line
                  x1={winLine!.x1}
                  y1={winLine!.y1}
                  x2={winLine!.x2}
                  y2={winLine!.y2}
                  stroke="var(--accent)"
                  strokeWidth={0.1}
                  strokeLinecap="round"
                  className="draw-line"
                />
              </svg>
            </div>
          )}
        </div>

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
      </div>
    </div>
  );
}

// ---------- Share Button ----------
function ShareButton({ getUrl }: { getUrl: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        try {
          const url = getUrl();
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            });
          } else {
            // Fallback
            const ta = document.createElement("textarea");
            ta.value = url; document.body.appendChild(ta); ta.select();
            document.execCommand("copy"); document.body.removeChild(ta);
            setCopied(true); setTimeout(() => setCopied(false), 1200);
          }
        } catch {}
      }}
      className="rounded-xl bg-[color:var(--panel)] px-3 py-2 text-sm shadow hover:brightness-110 active:scale-[.98]"
    >
      {copied ? "Copied!" : "Share Link"}
    </button>
  );
}

// ---------- Global Styles (tailwind-friendly) ----------
function StyleTag() {
  return (
    <style>{`
      /* --- Visual Identity Upgrades --- */
      /* Animated mesh background */
      body { background-attachment: fixed; }
      .mesh-bg { position: relative; }
      .mesh-bg::before {
        content: "";
        position: fixed; inset: -20vmax; z-index: -2;
        background:
          radial-gradient(40vmax 40vmax at 10% 10%, #ff8ad4 0%, transparent 60%),
          radial-gradient(45vmax 35vmax at 90% 20%, #8ab6ff 0%, transparent 60%),
          radial-gradient(35vmax 45vmax at 20% 90%, #b1ff8a 0%, transparent 60%),
          radial-gradient(50vmax 50vmax at 80% 80%, #ffd28a 0%, transparent 60%);
        filter: blur(40px) saturate(1.15);
        animation: meshShift 18s ease-in-out infinite alternate;
      }
      @keyframes meshShift {
        50% { transform: translate3d(2%, -1%, 0) scale(1.03); filter: blur(50px) saturate(1.2); }
        100% { transform: translate3d(-2%, 1%, 0) scale(1.04); }
      }
      /* Subtle noise film */
      .mesh-bg::after {
        content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0 0 0 0 0.05"/></feComponentTransfer></filter><rect width="100%" height="100%" filter="url(%23n)"/></svg>');
        opacity: .15; mix-blend-mode: soft-light;
      }

      /* Neon grid backdrop for the board */
      .neon-grid {
        position: absolute; inset: 0; border-radius: 24px; overflow: hidden;
      }
      .neon-grid::before {
        content: ""; position: absolute; inset: 0;
        background:
          linear-gradient(transparent 98%, rgba(255,255,255,.12) 99%),
          linear-gradient(90deg, transparent 98%, rgba(255,255,255,.12) 99%);
        background-size: var(--cell) var(--cell), var(--cell) var(--cell);
        filter: drop-shadow(0 0 8px var(--glow));
        opacity: .35;
      }

      /* Tile styles: glassy, 3D tilt, neon ring focus */
      .tile { background: color-mix(in oklab, var(--tile), white 4%); box-shadow: inset 0 0 0 1px rgba(0,0,0,.04); backdrop-filter: saturate(1.2) blur(2px); }
      .tile-on { background: color-mix(in oklab, var(--tile-on), white 8%); box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); backdrop-filter: saturate(1.25) blur(2px); }
      .tile3d { transform-style: preserve-3d; transition: transform 180ms ease, box-shadow 200ms ease; }
      .tile3d:hover { transform: translateY(-2px) rotateX(1deg) rotateY(-1deg); box-shadow: 0 8px 24px var(--glow), inset 0 0 0 1px rgba(0,0,0,.06); }
      .tile3d:active { transform: translateY(0) scale(.98); }

      /* Neon animated border when focused */
      .focus-ring { position: relative; }
      .focus-ring::after {
        content: ""; position: absolute; inset: -2px; border-radius: 16px;
        background: conic-gradient(from 0deg, transparent, var(--primary), var(--accent), transparent 60%);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor; mask-composite: exclude;
        padding: 2px; opacity: .0; transition: opacity .2s ease; filter: blur(.3px);
        animation: spinConic 2.8s linear infinite;
      }
      .focus-ring:focus-visible::after, .focus-ring.is-focused::after { opacity: .9; }
      @keyframes spinConic { to { transform: rotate(360deg); } }

      /* Ripple effect */
      .ripple-btn { position: relative; overflow: hidden; }
      .ripple-btn::after { content: ""; position: absolute; inset: 50% auto auto 50%; width: 0; height: 0; border-radius: 999px; background: currentColor; opacity: 0.15; transform: translate(-50%, -50%) scale(1); }
      .ripple-btn.rippling::after { animation: ripple .45s ease-out forwards; }
      @keyframes ripple { from { width: 0; height: 0; opacity: .25; } to { width: 220%; height: 220%; opacity: 0; } }

      /* SVG ink-stroke animation */
      .draw-line { stroke-dasharray: 10; stroke-dashoffset: 10; animation: dash 600ms ease forwards; filter: drop-shadow(0 0 6px var(--glow)); }
      @keyframes dash { to { stroke-dashoffset: 0; } }

      /* Smooth theme cross-fade */
      html, body, #root { transition: background 300ms ease, color 300ms ease; }
    `}</style>
  );
}

// ---------- Minimal Runtime Tests (console.assert) ----------
function runDevTests() {
  try {
    console.groupCollapsed("GridGames tests");

    // TTT winner tests
    const empty: TTTCell[] = Array(9).fill("");
    console.assert(computeTTTWinner(empty, 3).winner === "", "Empty board has no winner");

    const rowWin: TTTCell[] = ["X", "X", "X", "", "", "", "", "", ""];
    console.assert(computeTTTWinner(rowWin, 3).winner === "X", "Row win detected");

    const colWin: TTTCell[] = ["O", "", "", "O", "", "", "O", "", ""];
    console.assert(computeTTTWinner(colWin, 3).winner === "O", "Column win detected");

    const diagWin: TTTCell[] = ["X", "", "", "", "X", "", "", "", "X"];
    console.assert(computeTTTWinner(diagWin, 3).winner === "X", "Diagonal win detected");

    // Base64 roundtrip
    const snap = { a: 1, b: "test", c: [true, false] };
    const roundtrip = base64Decode<typeof snap>(base64Encode(snap));
    console.assert(roundtrip && roundtrip.a === 1 && roundtrip.b === "test", "Base64 roundtrip ok");

    // PRNG determinism (same seed => same first 3 numbers)
    const r1 = mulberry32(123);
    const r2 = mulberry32(123);
    const seq1 = [r1(), r1(), r1()];
    const seq2 = [r2(), r2(), r2()];
    console.assert(JSON.stringify(seq1) === JSON.stringify(seq2), "PRNG deterministic");

    console.groupEnd();
  } catch (e) {
    console.error("Tests failed with exception:", e);
  }
}
