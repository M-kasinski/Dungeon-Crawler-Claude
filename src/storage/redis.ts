import { Redis } from "@upstash/redis";
import { type GameState, type Storage, DEFAULT_STATE } from "../state.js";

const REDIS_KEY = "dungeon:state";

export class RedisStorage implements Storage {
  private client = Redis.fromEnv();

  async load(): Promise<GameState> {
    const raw = await this.client.get<GameState>(REDIS_KEY);
    return raw ?? structuredClone(DEFAULT_STATE);
  }

  async save(state: GameState): Promise<void> {
    await this.client.set(REDIS_KEY, state);
  }
}
