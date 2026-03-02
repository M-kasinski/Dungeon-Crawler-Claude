export interface Item {
  name: string;
  type: string; // "weapon" | "armor" | "accessory" | "consumable" | "misc"
  description: string;
}

export interface StoryArc {
  title: string;       // ex: "Tome 1 : L'Éveil"
  acts: string[];      // ex: ["Acte 1 : Descente", "Acte 2 : La Guilde Noire"]
  climax: string;      // ex: "Confrontation Boss Floor 10"
  resolution: string;  // ex: "Marcus gagne sa réputation d'indépendant"
  current_act: number; // index 0-based dans acts[]
}

export interface GameState {
  player: {
    name: string | null;
    class: string | null;
    class_tier: number; // 0=none, 1=class, 2=evolution, 3=mastery
    level: number;
    location: string;
    perks: string[];
    backstory: string; // origine/motivation du protagoniste
    stats: { str: number; agi: number; int: number; vit: number; lck: number };
  };
  floor: number;
  tome: number;
  story_arc: StoryArc | null; // plan narratif de l'arc en cours
  story_threads: string[];    // fils narratifs non résolus
  total_words: number;        // compteur cumulatif de mots écrits
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
    backstory: "",
    stats: { str: 10, agi: 10, int: 10, vit: 10, lck: 10 },
  },
  floor: 1,
  tome: 1,
  story_arc: null,
  story_threads: [],
  total_words: 0,
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
