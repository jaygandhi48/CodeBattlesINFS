import express from "express";
import { redis } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
const router = express.Router();

router.get("/healthcheck", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisResponse = await redis.ping();
    res.status(200).json({
      status: "ok",
      postgres: "connected",
      redis: redisResponse === "PONG" ? "connected" : "error",
    });
  } catch (e) {
    res.send(503).json({
      status: "error",
      message: e.message,
    });
    console.log(e);
  }
});

router.get("/", (_req, res) => {
  res.send("Hello World");
});

export default router;
