import { executeAgainstTestCases } from "./judge0.js";

const testCase = {
  input: "2 3\n",
  expectedOutput: "5\n",
};

async function runCase({ name, sourceCode, expectedStatus }) {
  const result = await executeAgainstTestCases({
    sourceCode,
    testCases: [testCase],
    timeLimitMs: 2000,
  });

  const passed = result.status === expectedStatus;

  console.log(`\n${passed ? "PASS" : "FAIL"}: ${name}`);
  console.log(`Status: ${result.status}`);
  console.log(`Tests: ${result.testsPassed}/${result.testsTotal}`);
  console.log(`Time: ${result.executionMs} ms`);
  console.log(`Memory: ${result.memoryKb} KB`);

  return passed;
}

async function main() {
  console.log("Checking the CodeBattles execution service Judge0 client...");

  const results = [
    await runCase({
      name: "correct solution is accepted",
      sourceCode: "a, b = map(int, input().split())\nprint(a + b)\n",
      expectedStatus: "ACCEPTED",
    }),
    await runCase({
      name: "incorrect solution is rejected",
      sourceCode: "a, b = map(int, input().split())\nprint(a - b)\n",
      expectedStatus: "WRONG_ANSWER",
    }),
  ];

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
