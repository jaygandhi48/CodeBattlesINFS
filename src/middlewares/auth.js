import { prisma } from "../lib/prisma.js";

export async function requirePlayer(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Access denied. No session token provided.",
      });
    }

    const sessionToken = authHeader.slice(7).trim();

    if (!sessionToken) {
      return res.status(401).json({
        error: "Access denied. Invalid session token.",
      });
    }

    const player = await prisma.player.findUnique({
      where: {
        sessionToken,
      },
      select: {
        id: true,
        displayName: true,
        createdAt: true,
      },
    });

    if (!player) {
      return res.status(401).json({
        error: "Access denied. Invalid session token.",
      });
    }

    req.player = player;

    next();
  } catch (error) {
    console.error("Player authentication failed:", error);

    return res.status(500).json({
      error: "Authentication failed.",
    });
  }
}
