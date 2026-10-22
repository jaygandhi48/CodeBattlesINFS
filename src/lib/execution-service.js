const executionServiceUrl = (
  process.env.EXECUTION_SERVICE_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

const executionTimeoutMs = Number.parseInt(
  process.env.EXECUTION_SERVICE_TIMEOUT_MS ?? "120000",
  10,
);

const submissionStatuses = new Set([
  "ACCEPTED",
  "WRONG_ANSWER",
  "RUNTIME_ERROR",
  "COMPILATION_ERROR",
  "TIME_LIMIT_EXCEEDED",
  "INTERNAL_ERROR",
]);

export async function executeSubmission({
  sourceCode,
  testCases,
  timeLimitMs,
}) {
  const response = await fetch(`${executionServiceUrl}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceCode,
      testCases: testCases.map(({ input, expectedOutput }) => ({
        input,
        expectedOutput,
      })),
      timeLimitMs,
    }),
    signal: AbortSignal.timeout(executionTimeoutMs),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Execution service request failed (${response.status}): ${
        body?.error ?? response.statusText
      }`,
    );
  }

  if (
    !body?.data ||
    !submissionStatuses.has(body.data.status) ||
    !Number.isInteger(body.data.testsPassed) ||
    !Number.isInteger(body.data.testsTotal) ||
    !Array.isArray(body.data.judgeTokens)
  ) {
    throw new Error("Execution service returned an invalid response.");
  }

  return body.data;
}
