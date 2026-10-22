const apiKey = process.env.JUDGE0_API_KEY;
const apiHost = process.env.JUDGE0_API_HOST ?? "judge0-ce.p.rapidapi.com";
const apiUrl = (process.env.JUDGE0_API_URL ?? `https://${apiHost}`).replace(
  /\/$/,
  "",
);

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function judge0Request(path, options = {}) {
  if (!apiKey) {
    throw new Error("JUDGE0_API_KEY is not configured.");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": apiHost,
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Judge0 request failed (${response.status}): ${
        body ? JSON.stringify(body) : response.statusText
      }`,
    );
  }

  return body;
}

let cachedPythonLanguageId;

async function getPythonLanguageId() {
  if (cachedPythonLanguageId) {
    return cachedPythonLanguageId;
  }

  const languages = await judge0Request("/languages");
  const python = languages.find((language) =>
    language.name.startsWith("Python (3"),
  );

  if (!python) {
    throw new Error("Judge0 did not return a Python 3 runtime.");
  }

  cachedPythonLanguageId = python.id;
  return cachedPythonLanguageId;
}

async function createJudge0Submission({
  sourceCode,
  languageId,
  stdin,
  expectedOutput,
  timeLimitMs,
}) {
  const query = new URLSearchParams({
    base64_encoded: "false",
    wait: "false",
    fields: "token",
  });

  return judge0Request(`/submissions?${query}`, {
    method: "POST",
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: languageId,
      stdin,
      expected_output: expectedOutput,
      cpu_time_limit: timeLimitMs / 1000,
      wall_time_limit: Math.max(5, (timeLimitMs / 1000) * 2),
      memory_limit: 128000,
      enable_network: false,
    }),
  });
}

async function waitForJudge0Result(token) {
  const fields = [
    "stdout",
    "stderr",
    "compile_output",
    "message",
    "status",
    "time",
    "memory",
  ].join(",");

  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const query = new URLSearchParams({
      base64_encoded: "false",
      fields,
    });

    const result = await judge0Request(`/submissions/${token}?${query}`);

    if (result.status?.id > 2) {
      return result;
    }

    await sleep(750);
  }

  throw new Error("Judge0 timed out while processing the submission.");
}

function mapJudge0Status(description) {
  if (description === "Accepted") return "ACCEPTED";
  if (description === "Wrong Answer") return "WRONG_ANSWER";
  if (description === "Compilation Error") return "COMPILATION_ERROR";
  if (description === "Time Limit Exceeded") return "TIME_LIMIT_EXCEEDED";
  if (description?.startsWith("Runtime Error")) return "RUNTIME_ERROR";
  return "INTERNAL_ERROR";
}

export async function executeAgainstTestCases({
  sourceCode,
  testCases,
  timeLimitMs,
}) {
  const languageId = await getPythonLanguageId();
  const judgeTokens = [];
  let testsPassed = 0;
  let status = "ACCEPTED";
  let executionMs = 0;
  let memoryKb = 0;

  for (const testCase of testCases) {
    const submission = await createJudge0Submission({
      sourceCode,
      languageId,
      stdin: testCase.input,
      expectedOutput: testCase.expectedOutput,
      timeLimitMs,
    });

    if (!submission.token) {
      throw new Error("Judge0 did not return a submission token.");
    }

    judgeTokens.push(submission.token);

    const result = await waitForJudge0Result(submission.token);
    const testStatus = mapJudge0Status(result.status?.description);
    const testExecutionMs = Number.parseFloat(result.time ?? "0") * 1000;
    const testMemoryKb = Number.parseInt(result.memory ?? "0", 10);

    executionMs += Number.isNaN(testExecutionMs)
      ? 0
      : Math.round(testExecutionMs);
    memoryKb = Math.max(
      memoryKb,
      Number.isNaN(testMemoryKb) ? 0 : testMemoryKb,
    );

    if (testStatus === "ACCEPTED") {
      testsPassed += 1;
      continue;
    }

    status = testStatus;
    break;
  }

  return {
    status,
    testsPassed,
    testsTotal: testCases.length,
    executionMs,
    memoryKb,
    judgeTokens,
  };
}
