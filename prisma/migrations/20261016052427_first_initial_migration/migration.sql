-- CreateEnum
CREATE TYPE "BattleStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('QUEUED', 'JUDGING', 'ACCEPTED', 'WRONG_ANSWER', 'RUNTIME_ERROR', 'COMPILATION_ERROR', 'TIME_LIMIT_EXCEEDED', 'INTERNAL_ERROR');

-- CreateTable
CREATE TABLE "Player" (
    "id" UUID NOT NULL,
    "displayName" VARCHAR(40) NOT NULL,
    "sessionToken" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "starterCode" TEXT NOT NULL DEFAULT '',
    "timeLimitMs" INTEGER NOT NULL DEFAULT 2000,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" UUID NOT NULL,
    "problemId" UUID NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" UUID NOT NULL,
    "roomCode" VARCHAR(8) NOT NULL,
    "problemId" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "winnerId" UUID,
    "status" "BattleStatus" NOT NULL DEFAULT 'WAITING',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattlePlayer" (
    "battleId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "seat" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattlePlayer_pkey" PRIMARY KEY ("battleId","playerId")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" UUID NOT NULL,
    "battleId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'QUEUED',
    "testsPassed" INTEGER NOT NULL DEFAULT 0,
    "testsTotal" INTEGER NOT NULL DEFAULT 0,
    "judgeTokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "executionMs" INTEGER,
    "memoryKb" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_sessionToken_key" ON "Player"("sessionToken");

-- CreateIndex
CREATE INDEX "TestCase_problemId_idx" ON "TestCase"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "TestCase_problemId_position_key" ON "TestCase"("problemId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Battle_roomCode_key" ON "Battle"("roomCode");

-- CreateIndex
CREATE INDEX "Battle_problemId_idx" ON "Battle"("problemId");

-- CreateIndex
CREATE INDEX "Battle_hostId_idx" ON "Battle"("hostId");

-- CreateIndex
CREATE INDEX "Battle_winnerId_idx" ON "Battle"("winnerId");

-- CreateIndex
CREATE INDEX "BattlePlayer_playerId_idx" ON "BattlePlayer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "BattlePlayer_battleId_seat_key" ON "BattlePlayer"("battleId", "seat");

-- CreateIndex
CREATE INDEX "Submission_battleId_submittedAt_idx" ON "Submission"("battleId", "submittedAt");

-- CreateIndex
CREATE INDEX "Submission_playerId_idx" ON "Submission"("playerId");

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattlePlayer" ADD CONSTRAINT "BattlePlayer_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattlePlayer" ADD CONSTRAINT "BattlePlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
