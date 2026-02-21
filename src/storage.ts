import { FileStorage } from "./storage/file.js";
import { RedisStorage } from "./storage/redis.js";
import type { Storage } from "./state.js";

export function getStorage(): Storage {
  return process.env.STORAGE_BACKEND === "redis"
    ? new RedisStorage()
    : new FileStorage();
}
