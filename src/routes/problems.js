import express from "express";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      starterCode = "",
      timeLimitMs = 2000,
      isPublished = false,
      testCases,
    } = req.body;

    //validation
    if (!(title?.trim() && description?.trim())) {
      return res.status(400).json({
        msg: "Title and description are required.",
      });
    }
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({
        msg: "At least one test case is required.",
      });
    }
    const invalidTestCase = testCases.some(
      (testCase) =>
        typeof testCase.input !== "string" ||
        typeof testCase.expectedOutput !== "string",
    );

    if (invalidTestCase) {
      return res.status(400).json({
        msg: "Every test case must have input and expectedOutput strings.",
      });
    }

    //save this into the db

    const problem = await prisma.problem.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        starterCode,
        timeLimitMs,
        isPublished,
        testCases: {
          create: testCases.map((testCase, index) => ({
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            isHidden: testCase.isHidden ?? true,
            position: index + 1,
          })),
        },
      },
      include: {
        testCases: {
          orderBy: {
            position: "asc",
          },
        },
      },
    });
    res.status(201).json({
      data: problem,
    });
  } catch (e) {
    res.status(500).json({ error: "failed to create the problem" });
  }
});

router.get("/", async (req, res) => {
  try {
    const problems = await prisma.problem.findMany({
      where: {
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        starterCode: true,
        timeLimitMs: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json({
      data: problems,
    });
  } catch (e) {
    res.status(500).json({ error: "failed to fetch all problems" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const problem = await prisma.problem.findFirst({
      where: {
        id,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        starterCode: true,
        timeLimitMs: true,
        createdAt: true,
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
    });

    if (!problem) {
      return res.status(404).json({
        error: "Problem not found.",
      });
    }

    return res.status(200).json({
      data: problem,
    });
  } catch (error) {
    console.error("Failed to fetch problem:", error);

    return res.status(500).json({
      error: "Failed to fetch problem.",
    });
  }
});

export default router;
