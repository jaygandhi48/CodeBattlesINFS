import express from "express";
import cors from "cors";
import router from "./routes/health.js";
import problemRouter from "./routes/problems.js";
import playerRouter from "./routes/player.js";
import { connectRedis } from "./lib/redis.js";
import battleRouter from "./routes/battles.js";
import { createServer } from "node:http";
import { configureSocketServer } from "./realtime/socket-server.js";
import { Server } from "socket.io";
import { configureRedisAdapter } from "./realtime/redis-adapter.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN,
  },
});

app.set("io", io);
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env_CORS_ORIGIN,
  }),
);
app.use(express.json());
app.use("/api", router);
app.use("/api/problems", problemRouter);
app.use("/api/players", playerRouter);
app.use("/api/battles", battleRouter);

async function start() {
  try {
    await connectRedis();
    configureSocketServer(io);
    await configureRedisAdapter(io);
    httpServer.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

start();
