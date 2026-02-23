export interface Item {
  name: string;
  type: string; // "weapon" | "armor" | "accessory" | "consumable" | "misc"
  description: string;
}

export interface GameState {
  player: {
    name: string | null;
    class: string | null;
    class_tier: number; // 0=none, 1=class, 2=evolution, 3=mastery
    level: number;
    location: string;
    perks: string[];
    stats: { str: number; agi: number; int: number; vit: number; lck: number };
  };
  floor: number;
  tome: number;
  inventory: Item[];
  equipped: {
    weapon: Item | null;
    armor: Item | null;
    accessory: Item | null;
  };
  visited_locations: string[];
  session_summary: string;
  floor_theme: string;
  floor_event_count: number;
  events_since_level_up: number;
  wounds: string[];
}

export interface Storage {
  load(): Promise<GameState>;
  save(state: GameState): Promise<void>;
}

export const DEFAULT_STATE: GameState = {
  player: {
    name: null,
    class: null,
    class_tier: 0,
    level: 1,
    location: "Floor 1 - Entrance",
    perks: [],
    stats: { str: 10, agi: 10, int: 10, vit: 10, lck: 10 },
  },
  floor: 1,
  tome: 1,
  inventory: [],
  equipped: {
    weapon: null,
    armor: null,
    accessory: null,
  },
  visited_locations: [],
  session_summary: "",
  floor_theme: "Dungeon Entrance",
  floor_event_count: 0,
  events_since_level_up: 0,
  wounds: [],
};
