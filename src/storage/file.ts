import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { type GameState, type Storage, DEFAULT_STATE } from "../state.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, "../../data/state.json");

export class FileStorage implements Storage {
  async load(): Promise<GameState> {
    if (!existsSync(STATE_PATH)) {
      return structuredClone(DEFAULT_STATE);
    }
    const raw = readFileSync(STATE_PATH, "utf-8");
    return JSON.parse(raw) as GameState;
  }

  async save(state: GameState): Promise<void> {
    const dir = dirname(STATE_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
  }
}
