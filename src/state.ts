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

export interface Storage {
  load(): Promise<GameState>;
  save(state: GameState): Promise<void>;
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
