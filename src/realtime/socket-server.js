import { prisma } from "../lib/prisma.js";

export function configureSocketServer(io) {
  io.use(async (socket, next) => {
    const getSessionToken = socket.handshake.auth.sessionToken;
    if (!getSessionToken) {
      return next(new Error("Error relating to authentication"));
    }
    const player = await prisma.player.findUnique({
      where: {
        sessionToken: getSessionToken,
      },
      select: {
        id: true,
        displayName: true,
      },
    });
    if (!player) {
      return next(new Error("Error relating authentication"));
    }
    socket.data.player = player;
    next();
    // Read sessionToken
    // Reject if missing
    // Find player
    // Reject if invalid
    // Set socket.data.player
    // Call next()
  });

  io.on("connection", (socket) => {
    console.log(`${socket.data.player.displayName} connected`);
    socket.on("disconnect", () => {
      console.log(`${socket.data.player.displayName} disconnected`);
    });
    socket.on("battle:join", async ({ roomCode }, callback) => {
      try {
        if (typeof roomCode !== "string" || !roomCode.trim()) {
          return callback({
            success: false,
            error: "Room code is required.",
          });
        }

        const normalizedRoomCode = roomCode.trim().toUpperCase();
        const player = socket.data.player;

        const battle = await prisma.battle.findUnique({
          where: {
            roomCode: normalizedRoomCode,
          },
          include: {
            players: {
              select: {
                playerId: true,
              },
            },
          },
        });

        if (!battle) {
          return callback({
            success: false,
            error: "Battle does not exist.",
          });
        }

        const isPartOfBattle = battle.players.some(
          (membership) => membership.playerId === player.id,
        );

        if (!isPartOfBattle) {
          return callback({
            success: false,
            error: "You are not part of this battle.",
          });
        }

        const socketRoom = `battle:${normalizedRoomCode}`;

        await socket.join(socketRoom);

        return callback({
          success: true,
          roomCode: normalizedRoomCode,
          status: battle.status,
          version: battle.version,
        });
      } catch (error) {
        console.error("Failed to join Socket.IO room:", error);

        return callback({
          success: false,
          error: "Unable to join the live battle room.",
        });
      }
    });
  });
}
