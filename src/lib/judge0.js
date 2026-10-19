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

  return body; //null if .json() fails
}

let pythonId;
export async function getPythonID() {
  if (pythonId) {
    return pythonId;
  }
  const languages = await judge0Request("/languages");
  const python = languages.find((language) =>
    language.name.startsWith("Python (3"),
  );
  if (!python) {
    throw new Error("Judge0 did not return a Python 3 runtime.");
  }
  pythonId = python.id;
  return pythonId;
}

export async function createJudge0Submission({
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

export async function waitForJudge0Result(token) {
  const requiredFields = [
    "stdout",
    "stderr",
    "compile_output",
    "message",
    "status",
    "time",
    "memory",
  ].join(",");

  const timeLimit = Date.now() + 30000;
  while (Date.now() < timeLimit) {
    const query = new URLSearchParams({
      base64_encoded: "false",
      requiredFields,
    });

    const result = await judge0Request(`/submissions/${token}?${query}`);

    //note that status is 2 mean its processing while status 1 is in queue, else its success, error, wrong ans, etc
    if (result.status?.id > 2) {
      return result;
    }
    sleep(750);
  }
  throw new Error("Judge0 timed out while processing the submission."); //When data.Now() > timelimit its timedout
}

export function mapJudge0Status(description) {
  if (description === "Accepted") {
    return "ACCEPTED";
  }

  if (description === "Wrong Answer") {
    return "WRONG_ANSWER";
  }

  if (description === "Compilation Error") {
    return "COMPILATION_ERROR";
  }

  if (description === "Time Limit Exceeded") {
    return "TIME_LIMIT_EXCEEDED";
  }

  if (description?.startsWith("Runtime Error")) {
    return "RUNTIME_ERROR";
  }

  return "INTERNAL_ERROR";
}
