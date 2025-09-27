// Game Types
export type Theme = "light" | "dark" | "playful" | "high-contrast";
export type Mode = "grid" | "tictactoe" | "memory";
export type TTTCell = "" | "X" | "O";

// Game State Interfaces
export interface MemoryState {
  pattern: number[];
  revealStep: number;
  isRevealing: boolean;
  inputIndex: number;
  level: number;
  score: number;
  dailySeedOn: boolean;
}

export interface TTTScore {
  X: number;
  O: number;
  Draws: number;
}

export interface PersistedSnapshot {
  version: 1;
  n: number;
  mode: Mode;
  theme: Theme;
  grid: (boolean | TTTCell)[];
  currentPlayer?: TTTCell;
  tttScore?: TTTScore;
  memory?: MemoryState;
}

// Component Props
export interface GridCellProps {
  index: number;
  value: boolean | TTTCell;
  isFocused: boolean;
  mode: Mode;
  memoryState: MemoryState;
  onClick: (index: number, event?: React.MouseEvent<HTMLButtonElement>) => void;
  onFocus: (index: number) => void;
}

export interface GameHeaderProps {
  mode: Mode;
  theme: Theme;
  n: number;
  onModeChange: (mode: Mode) => void;
  onThemeChange: (theme: Theme) => void;
  onSizeChange: (size: number) => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onShare: () => string;
}

export interface GameStatusProps {
  mode: Mode;
  currentPlayer?: TTTCell;
  tttScore?: TTTScore;
  memoryState?: MemoryState;
  onMemoryAction?: (action: 'replay' | 'start') => void;
  onMemorySettingChange?: (dailySeed: boolean) => void;
}
