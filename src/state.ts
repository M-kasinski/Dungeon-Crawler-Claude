import { randomUUID } from "crypto";

export type ItemType = "weapon" | "armor" | "accessory" | "consumable" | "misc";

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  description: string;
}

export interface Wound {
  id: string;
  description: string;
}

export interface StoryThread {
  id: string;
  text: string;
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
  story_threads: StoryThread[]; // fils narratifs non résolus
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
  wounds: Wound[];
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

type LegacyItem = Omit<Item, "id"> & { id?: string };
type LegacyWound = Wound | string;
type LegacyStoryThread = StoryThread | string;
type LegacyState = Omit<GameState, "inventory" | "wounds" | "story_threads"> & {
  inventory?: LegacyItem[];
  wounds?: LegacyWound[];
  story_threads?: LegacyStoryThread[];
};

const ITEM_TYPES: ItemType[] = ["weapon", "armor", "accessory", "consumable", "misc"];

export function createEntityId(): string {
  return randomUUID();
}

function normalizeItemType(type: unknown): ItemType {
  return typeof type === "string" && ITEM_TYPES.includes(type as ItemType)
    ? (type as ItemType)
    : "misc";
}

function normalizeItem(item: LegacyItem): Item {
  return {
    id: typeof item.id === "string" && item.id.length > 0 ? item.id : createEntityId(),
    name: item.name,
    type: normalizeItemType(item.type),
    description: item.description,
  };
}

function normalizeWound(wound: LegacyWound): Wound {
  if (typeof wound === "string") {
    return { id: createEntityId(), description: wound };
  }

  return {
    id: typeof wound.id === "string" && wound.id.length > 0 ? wound.id : createEntityId(),
    description: wound.description,
  };
}

function normalizeStoryThread(thread: LegacyStoryThread): StoryThread {
  if (typeof thread === "string") {
    return { id: createEntityId(), text: thread };
  }

  return {
    id: typeof thread.id === "string" && thread.id.length > 0 ? thread.id : createEntityId(),
    text: thread.text,
  };
}

export function normalizeState(raw: LegacyState | null | undefined): GameState {
  const base = structuredClone(DEFAULT_STATE);
  if (!raw) {
    return base;
  }

  return {
    ...base,
    ...raw,
    player: {
      ...base.player,
      ...raw.player,
      stats: {
        ...base.player.stats,
        ...raw.player?.stats,
      },
    },
    inventory: (raw.inventory ?? []).map(normalizeItem),
    equipped: {
      weapon: raw.equipped?.weapon ? normalizeItem(raw.equipped.weapon) : null,
      armor: raw.equipped?.armor ? normalizeItem(raw.equipped.armor) : null,
      accessory: raw.equipped?.accessory ? normalizeItem(raw.equipped.accessory) : null,
    },
    wounds: (raw.wounds ?? []).map(normalizeWound),
    story_threads: (raw.story_threads ?? []).map(normalizeStoryThread),
  };
}
