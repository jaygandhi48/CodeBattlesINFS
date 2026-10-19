const apiKey = process.env.JUDGE0_API_KEY;
const apiHost = process.env.JUDGE0_API_HOST ?? "judge0-ce.p.rapidapi.com";
const apiUrl = (process.env.JUDGE0_API_URL ?? `https://${apiHost}`).replace(
  /\/$/,
  "",
);

if (!apiKey) {
  console.error(
    "Missing JUDGE0_API_KEY. Copy .env.example to .env and add your RapidAPI key.",
  );
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "X-RapidAPI-Key": apiKey,
  "X-RapidAPI-Host": apiHost,
};

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function judge0Request(path, options = {}) {
  //initial fetch
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const details = body ? JSON.stringify(body) : response.statusText;
    throw new Error(`Judge0 request failed (${response.status}): ${details}`);
  }

  return body;
}

async function findPythonLanguageId() {
  const languages = await judge0Request("/languages");
  const python = languages.find((language) =>
    language.name.startsWith("Python (3"),
  );

  if (!python) {
    throw new Error("Judge0 did not return a Python 3 runtime.");
  }

  return python;
}

async function createSubmission({
  sourceCode,
  languageId,
  stdin,
  expectedOutput,
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
      cpu_time_limit: 2,
      wall_time_limit: 5,
      memory_limit: 128000,
      enable_network: false,
    }),
  });
}

async function waitForResult(token) {
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

  throw new Error(
    "Timed out while waiting for Judge0 to finish the submission.",
  );
}

async function runCase({ name, sourceCode, expectedStatus, languageId }) {
  const submission = await createSubmission({
    sourceCode,
    languageId,
    stdin: "2 3\n",
    expectedOutput: "5\n",
  });

  if (!submission.token) {
    throw new Error(`Judge0 did not return a token for ${name}.`);
  }

  const result = await waitForResult(submission.token);
  const passed = result.status?.description === expectedStatus;

  console.log(`\n${passed ? "PASS" : "FAIL"}: ${name}`);
  console.log(`Status: ${result.status?.description ?? "Unknown"}`);
  console.log(`Output: ${JSON.stringify(result.stdout ?? "")}`);
  console.log(`Time: ${result.time ?? "n/a"} s`);
  console.log(`Memory: ${result.memory ?? "n/a"} KB`);

  if (result.stderr) console.log(`stderr: ${result.stderr}`);
  if (result.compile_output)
    console.log(`compile output: ${result.compile_output}`);
  if (result.message) console.log(`message: ${result.message}`);

  return passed;
}

async function main() {
  console.log("Checking Judge0 connectivity...");
  const python = await findPythonLanguageId();
  console.log(`Using ${python.name} (language ID ${python.id}).`);

  const cases = [
    {
      name: "correct solution is accepted",
      sourceCode: "a, b = map(int, input().split())\nprint(a + b)\n",
      expectedStatus: "Accepted",
    },
    {
      name: "incorrect solution is rejected",
      sourceCode: "a, b = map(int, input().split())\nprint(a - b)\n",
      expectedStatus: "Wrong Answer",
    },
  ];

  const results = [];
  for (const testCase of cases) {
    results.push(await runCase({ ...testCase, languageId: python.id }));
  }

  if (results.every(Boolean)) {
    console.log("\nJudge0 smoke test completed successfully.");
    return;
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\nSmoke test failed: ${error.message}`);
  process.exitCode = 1;
});
