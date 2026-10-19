import crypto from "node:crypto";
import express from "express";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { displayName } = req.body;
    //Validation was performed by AI
    if (typeof displayName !== "string" || displayName.trim().length === 0) {
      return res.status(400).json({
        error: "Display name is required.",
      });
    }
    if (displayName.trim().length > 40) {
      return res.status(400).json({
        error: "Display name cannot exceed 40 characters.",
      });
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");

    const player = await prisma.player.create({
      data: {
        displayName: displayName.trim(),
        sessionToken,
      },
      select: {
        id: true,
        displayName: true,
        sessionToken: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      data: player,
    });
  } catch (error) {
    console.error("Failed to create player:", error);

    return res.status(500).json({
      error: "Failed to create player.",
    });
  }
});

export default router;
