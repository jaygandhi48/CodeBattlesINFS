import crypto from "node:crypto";
import express from "express";
import { prisma } from "../lib/prisma.js";
import { requirePlayer } from "../middlewares/auth.js";
import { executeSubmission } from "../lib/execution-service.js";
const router = express.Router();

router.post("/", requirePlayer, async (req, res) => {
  try {
    const { problemId } = req.body;
    const player = req.player;

    if (!problemId) {
      return res.status(400).json({
        msg: "Problem ID is required.",
      });
    }

    const problem = await prisma.problem.findFirst({
      where: {
        id: problemId,
        isPublished: true,
      },
    });

    if (!problem) {
      return res.status(404).json({
        error: "Published problem not found.",
      });
    }

    const roomCode = crypto.randomBytes(3).toString("hex").toUpperCase();

    const battle = await prisma.battle.create({
      data: {
        roomCode,
        problemId,
        hostId: player.id,
        players: {
          create: {
            playerId: player.id,
            seat: 1,
          },
        },
      },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
          },
        },
        players: {
          include: {
            player: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      data: battle,
    });
  } catch (error) {
    console.error("Failed to create battle:", error);

    return res.status(500).json({
      msg: "Something went wrong.",
    });
  }
});

router.post("/:roomCode/join", requirePlayer, async (req, res) => {
  try {
    const roomCode = req.params.roomCode.trim().toUpperCase();
    const player = req.player;
    const battle = await prisma.battle.findUnique({
      where: { roomCode },
      include: {
        players: true,
      },
    });

    if (!battle) {
      return res.status(404).json({
        msg: "This room does not exist",
      });
    }

    const isPlayerAlreadyIn = battle.players.some(
      (P) => P.playerId === player.id,
    );
    if (isPlayerAlreadyIn) {
      return res.status(409).json({
        msg: "You have already joined this battle.",
      });
    }

    if (battle.status !== "WAITING") {
      return res.status(409).json({
        msg: "This battle is no longer accepting players.",
      });
    }

    if (battle.players.length >= 2) {
      return res.status(409).json({
        msg: "This battle is full.",
      });
    }
    const updatedBattle = await prisma.$transaction(async (transaction) => {
      await transaction.battlePlayer.create({
        data: {
          battleId: battle.id,
          playerId: player.id,
          seat: 2,
        },
      });

      return transaction.battle.update({
        where: {
          id: battle.id,
        },
        data: {
          status: "ACTIVE",
          startedAt: new Date(),
          version: {
            increment: 1,
          },
        },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              description: true,
              starterCode: true,
              timeLimitMs: true,
            },
          },
          players: {
            orderBy: {
              seat: "asc",
            },
            include: {
              player: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
        },
      });
    });

    //get the socket from rest

    const io = req.app.get("io");
    const socketRoom = `battle:${roomCode}`;
    io.to(socketRoom).emit("battle:started", {
      roomCode: updatedBattle.roomCode,
      version: updatedBattle.version,
      startedAt: updatedBattle.startedAt,
      players: updatedBattle.players,
      status: updatedBattle.status,
    });
    return res.status(200).json({
      data: updatedBattle,
    });
  } catch (error) {
    console.error("Failed to join battle:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        error: "This battle is already full.",
      });
    }

    return res.status(500).json({
      error: "Failed to join battle.",
    });
  }
});

router.get("/:roomCode", requirePlayer, async (req, res) => {
  try {
    const roomCode = req.params.roomCode.trim().toUpperCase();
    const player = req.player;

    const battle = await prisma.battle.findUnique({
      where: {
        roomCode,
      },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            description: true,
            starterCode: true,
            timeLimitMs: true,
            testCases: {
              where: {
                isHidden: false,
              },
              select: {
                id: true,
                input: true,
                expectedOutput: true,
                position: true,
              },
              orderBy: {
                position: "asc",
              },
            },
          },
        },
        players: {
          orderBy: {
            seat: "asc",
          },
          include: {
            player: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
        winner: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    if (!battle) {
      return res.status(404).json({
        error: "Battle not found.",
      });
    }

    const isParticipant = battle.players.some(
      (battlePlayer) => battlePlayer.playerId === player.id,
    );

    if (!isParticipant) {
      return res.status(403).json({
        error: "You are not a participant in this battle.",
      });
    }

    return res.status(200).json({
      data: battle,
    });
  } catch (error) {
    console.error("Failed to retrieve battle:", error);

    return res.status(500).json({
      error: "Failed to retrieve battle.",
    });
  }
});

//Submit, you have to submit on all testcases
router.post("/:roomCode/submissions", requirePlayer, async (req, res) => {
  let createdSubmission;

  try {
    const roomCode = req.params.roomCode.trim().toUpperCase();
    const player = req.player;
    const { sourceCode } = req.body;

    if (typeof sourceCode !== "string" || sourceCode.trim().length === 0) {
      return res.status(400).json({
        error: "Source code is required.",
      });
    }

    const battle = await prisma.battle.findUnique({
      where: {
        roomCode,
      },
      include: {
        players: {
          select: {
            playerId: true,
          },
        },
        problem: {
          select: {
            timeLimitMs: true,
            testCases: {
              orderBy: {
                position: "asc",
              },
            },
          },
        },
      },
    });

    if (!battle) {
      return res.status(404).json({
        error: "Battle not found.",
      });
    }

    const isParticipant = battle.players.some(
      (battlePlayer) => battlePlayer.playerId === player.id,
    );

    if (!isParticipant) {
      return res.status(403).json({
        error: "You are not a participant in this battle.",
      });
    }

    if (battle.status !== "ACTIVE") {
      return res.status(409).json({
        error: "This battle is not active.",
      });
    }

    if (battle.problem.testCases.length === 0) {
      return res.status(409).json({
        error: "This problem does not have any test cases.",
      });
    }

    createdSubmission = await prisma.submission.create({
      data: {
        battleId: battle.id,
        playerId: player.id,
        sourceCode,
        status: "QUEUED",
        testsTotal: battle.problem.testCases.length,
      },
    });

    const judgingSubmission = await prisma.submission.update({
      where: {
        id: createdSubmission.id,
      },
      data: {
        status: "JUDGING",
      },
    });

    //Before calling jude 0, broadcast to battle:ROOM_CODE an event submission:judging
    const io = req.app.get("io");
    const socketRoom = `battle:${roomCode}`;
    io.to(socketRoom).emit("submission:judging", {
      submissionId: judgingSubmission.id,
      playerId: judgingSubmission.playerId,
      status: judgingSubmission.status,
      submittedAt: judgingSubmission.submittedAt,
    });

    const executionResult = await executeSubmission({
      sourceCode,
      testCases: battle.problem.testCases,
      timeLimitMs: battle.problem.timeLimitMs,
    });

    const {
      status: finalStatus,
      testsPassed,
      judgeTokens,
      executionMs: totalExecutionMs,
      memoryKb: maximumMemoryKb,
    } = executionResult;

    const result = await prisma.$transaction(async (transaction) => {
      const submission = await transaction.submission.update({
        where: {
          id: createdSubmission.id,
        },
        data: {
          status: finalStatus,
          testsPassed,
          judgeTokens,
          executionMs: totalExecutionMs,
          memoryKb: maximumMemoryKb,
          completedAt: new Date(),
        },
        select: {
          id: true,
          playerId: true,
          status: true,
          testsPassed: true,
          testsTotal: true,
          executionMs: true,
          memoryKb: true,
          submittedAt: true,
          completedAt: true,
        },
      });
      let won = false;
      let finishedBattle = null;

      if (finalStatus === "ACCEPTED") {
        const battleUpdate = await transaction.battle.updateMany({
          where: {
            id: battle.id,
            status: "ACTIVE",
            winnerId: null,
          },
          data: {
            status: "FINISHED",
            winnerId: player.id,
            finishedAt: new Date(),
            version: {
              increment: 1,
            },
          },
        });

        won = battleUpdate.count === 1;

        if (won) {
          finishedBattle = await transaction.battle.findUnique({
            where: {
              id: battle.id,
            },
            select: {
              roomCode: true,
              status: true,
              version: true,
              winnerId: true,
              finishedAt: true,
            },
          });
        }
      }

      return {
        submission,
        won,
        finishedBattle,
      };
    });

    io.to(socketRoom).emit("submission:completed", {
      submissionId: result.submission.id,
      playerId: result.submission.playerId,
      status: result.submission.status,
      testsPassed: result.submission.testsPassed,
      testsTotal: result.submission.testsTotal,
      executionMs: result.submission.executionMs,
      memoryKb: result.submission.memoryKb,
      completedAt: result.submission.completedAt,
      won: result.won,
    });

    if (result.won) {
      io.to(socketRoom).emit("battle:finished", {
        roomCode: result.finishedBattle.roomCode,
        status: result.finishedBattle.status,
        version: result.finishedBattle.version,
        winnerId: result.finishedBattle.winnerId,
        finishedAt: result.finishedBattle.finishedAt,
      });
    }

    return res.status(200).json({
      data: {
        ...result.submission,
        won: result.won,
      },
    });
  } catch (error) {
    console.error("Submission processing failed:", error);

    if (createdSubmission) {
      const failedSubmission = await prisma.submission
        .update({
          where: {
            id: createdSubmission.id,
          },
          data: {
            status: "INTERNAL_ERROR",
            completedAt: new Date(),
          },
          select: {
            id: true,
            playerId: true,
            status: true,
            testsPassed: true,
            testsTotal: true,
            completedAt: true,
          },
        })
        .catch((updateError) => {
          console.error(
            "Failed to mark submission as an internal error:",
            updateError,
          );

          return null;
        });

      if (failedSubmission) {
        const roomCode = req.params.roomCode.trim().toUpperCase();
        const io = req.app.get("io");

        io.to(`battle:${roomCode}`).emit("submission:completed", {
          submissionId: failedSubmission.id,
          playerId: failedSubmission.playerId,
          status: failedSubmission.status,
          testsPassed: failedSubmission.testsPassed,
          testsTotal: failedSubmission.testsTotal,
          executionMs: null,
          memoryKb: null,
          completedAt: failedSubmission.completedAt,
          won: false,
        });
      }
    }

    return res.status(500).json({
      error: "Failed to process submission.",
    });
  }
});
export default router;
