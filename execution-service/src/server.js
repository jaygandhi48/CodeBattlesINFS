import express from "express";
import { executeAgainstTestCases } from "./judge0.js";

const app = express();
const port = Number.parseInt(process.env.PORT ?? "3001", 10);

app.use(express.json({ limit: "256kb" }));

app.get("/healthcheck", (_req, res) => {
  if (!process.env.JUDGE0_API_KEY) {
    return res.status(503).json({
      status: "error",
      service: "execution-service",
      message: "Judge0 credentials are not configured.",
    });
  }

  return res.status(200).json({
    status: "ok",
    service: "execution-service",
  });
});

app.post("/execute", async (req, res) => {
  const { sourceCode, testCases, timeLimitMs } = req.body ?? {};

  if (typeof sourceCode !== "string" || sourceCode.trim().length === 0) {
    return res.status(400).json({ error: "Source code is required." });
  }

  if (!Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({ error: "At least one test case is required." });
  }

  const invalidTestCase = testCases.some(
    (testCase) =>
      typeof testCase?.input !== "string" ||
      typeof testCase?.expectedOutput !== "string",
  );

  if (invalidTestCase) {
    return res.status(400).json({
      error: "Every test case requires string input and expectedOutput values.",
    });
  }

  if (!Number.isInteger(timeLimitMs) || timeLimitMs <= 0) {
    return res.status(400).json({
      error: "timeLimitMs must be a positive integer.",
    });
  }

  try {
    const result = await executeAgainstTestCases({
      sourceCode,
      testCases,
      timeLimitMs,
    });

    return res.status(200).json({ data: result });
  } catch (error) {
    console.error("Code execution failed:", error);

    return res.status(502).json({
      error: "The execution service could not complete the submission.",
    });
  }
});

app.listen(port, () => {
  console.log(`Execution service running at http://localhost:${port}`);
});
