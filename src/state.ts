import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, "../data/state.json");

export interface Item {
  name: string;
  type: string; // "weapon" | "armor" | "accessory" | "consumable" | "misc"
  description: string;
}

export interface GameState {
  player: {
    name: string | null;
    class: string | null;
    level: number;
    location: string;
    perks: string[];
  };
  inventory: Item[];
  equipped: {
    weapon: Item | null;
    armor: Item | null;
    accessory: Item | null;
  };
  visited_locations: string[];
  session_summary: string;
}

export const DEFAULT_STATE: GameState = {
  player: {
    name: null,
    class: null,
    level: 1,
    location: "Floor 1 - Entrance",
    perks: [],
  },
  inventory: [],
  equipped: {
    weapon: null,
    armor: null,
    accessory: null,
  },
  visited_locations: [],
  session_summary: "",
};

export function loadState(): GameState {
  if (!existsSync(STATE_PATH)) {
    return structuredClone(DEFAULT_STATE);
  }
  const raw = readFileSync(STATE_PATH, "utf-8");
  return JSON.parse(raw) as GameState;
}

export function saveState(state: GameState): void {
  const dir = dirname(STATE_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}
