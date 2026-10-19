import "dotenv/config";
import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

redis.on("error", (error) => {
  console.error("Redis error:", error.message);
});

export async function connectRedis() {
  if (!redis.isOpen) {
    //if already not open then connect with redis
    await redis.connect();
  }
}
