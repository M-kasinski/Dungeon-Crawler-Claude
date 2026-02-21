import { createClient } from "redis";
import { type GameState, type Storage, DEFAULT_STATE } from "../state.js";

const REDIS_KEY = "dungeon:state";

let client: ReturnType<typeof createClient> | null = null;

async function getClient(): Promise<ReturnType<typeof createClient>> {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (err) => console.error("Redis client error:", err));
    await client.connect();
  }
  return client;
}

export class RedisStorage implements Storage {
  async load(): Promise<GameState> {
    const c = await getClient();
    const raw = await c.get(REDIS_KEY);
    return raw ? (JSON.parse(raw) as GameState) : structuredClone(DEFAULT_STATE);
  }

  async save(state: GameState): Promise<void> {
    const c = await getClient();
    await c.set(REDIS_KEY, JSON.stringify(state));
  }
}
