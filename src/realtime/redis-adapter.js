import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

//crate redis pub/sub connections

export async function configureRedisAdapter(io) {
  const pub = createClient({ url: process.env.REDIS_URL });
  const sub = pub.duplicate(); //both pub sub return a promise
  pub.on("error", (error) => {
    console.error("Socket.IO Redis publisher error:", error);
  });
  sub.on("error", (error) => {
    console.error("Socket.IO Redis subscriber error:", error);
  });
  await Promise.all([pub.connect(), sub.connect()]);
  io.adapter(createAdapter(pub, sub));
  return { pub, sub };
}
