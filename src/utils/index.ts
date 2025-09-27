import { type TTTCell } from '../types';

// Mathematical utilities
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const idx = (row: number, col: number, n: number) => row * n + col;
export const rc = (i: number, n: number) => ({ r: Math.floor(i / n), c: i % n });

// Encoding utilities
export function base64Encode(obj: unknown): string {
  const s = JSON.stringify(obj);
  if (typeof window === "undefined") return s;
  return btoa(unescape(encodeURIComponent(s)));
}

export function base64Decode<T>(str: string): T | null {
  try {
    const s = decodeURIComponent(escape(atob(str)));
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

// Game logic utilities
export function computeTTTWinner(cells: TTTCell[], n: number) {
  if (n !== 3) return { winner: "" as TTTCell, line: null as null | number[] };
  
  const lines: number[][] = [];
  // Rows
  for (let r = 0; r < n; r++) lines.push([idx(r, 0, n), idx(r, 1, n), idx(r, 2, n)]);
  // Columns
  for (let c = 0; c < n; c++) lines.push([idx(0, c, n), idx(1, c, n), idx(2, c, n)]);
  // Diagonals
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

// Deterministic PRNG for Memory game
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Win line calculation for TicTacToe
export function calculateWinLine(line: number[] | null, n: number) {
  if (!line) return null;
  
  const step = 1;
  const toCenter = (r: number, c: number) => ({ 
    x: c * step + step / 2, 
    y: r * step + step / 2 
  });
  
  const a = rc(line[0], n);
  const c = rc(line[2], n);
  const p1 = toCenter(a.r, a.c);
  const p2 = toCenter(c.r, c.c);
  
  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
}

// Performance utilities
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
}
