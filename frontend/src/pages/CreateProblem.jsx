import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createProblem } from "../api/index.js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emptyTestCase = () => ({
  input: "",
  expectedOutput: "",
  isHidden: false,
});

export function CreateProblem() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [timeLimitMs, setTimeLimitMs] = useState(2000);
  const [isPublished, setIsPublished] = useState(true);
  const [testCases, setTestCases] = useState([emptyTestCase()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdProblem, setCreatedProblem] = useState(null);

  function updateTestCase(index, field, value) {
    setTestCases((current) =>
      current.map((testCase, testCaseIndex) =>
        testCaseIndex === index
          ? { ...testCase, [field]: value }
          : testCase,
      ),
    );
  }

  function addTestCase() {
    setTestCases((current) => [
      ...current,
      { ...emptyTestCase(), isHidden: true },
    ]);
  }

  function removeTestCase(index) {
    setTestCases((current) =>
      current.filter((_, testCaseIndex) => testCaseIndex !== index),
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!title.trim() || !description.trim()) {
      setError("Enter a title and description.");
      return;
    }

    if (
      testCases.length === 0 ||
      testCases.some(
        (testCase) =>
          !testCase.input.trim() || !testCase.expectedOutput.trim(),
      )
    ) {
      setError("Every test case needs an input and expected output.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setCreatedProblem(null);

      const problem = await createProblem({
        title: title.trim(),
        description: description.trim(),
        starterCode,
        timeLimitMs: Number(timeLimitMs),
        isPublished,
        testCases,
      });

      setCreatedProblem(problem);
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setStarterCode("");
    setTimeLimitMs(2000);
    setIsPublished(true);
    setTestCases([emptyTestCase()]);
    setCreatedProblem(null);
    setError("");
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Admin tools
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Create a problem
            </h1>
            <p className="mt-2 text-muted-foreground">
              Add the challenge, starter code, and test cases used for judging.
            </p>
          </div>

          <Button variant="outline" onClick={() => navigate("/")}>
            Back to lobby
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Problem details</CardTitle>
              <CardDescription>
                This information is shown to both players during a battle.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Add Two Numbers"
                  disabled={submitting}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Read two integers and print their sum."
                  disabled={submitting}
                  rows={5}
                  className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="starterCode">Starter code</Label>
                <textarea
                  id="starterCode"
                  value={starterCode}
                  onChange={(event) => setStarterCode(event.target.value)}
                  placeholder="a, b = map(int, input().split())"
                  disabled={submitting}
                  rows={5}
                  spellCheck={false}
                  className="w-full resize-y rounded-lg border border-input bg-muted/20 px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timeLimit">Time limit (milliseconds)</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="100"
                    step="100"
                    value={timeLimitMs}
                    onChange={(event) => setTimeLimitMs(event.target.value)}
                    disabled={submitting}
                    className="h-10"
                  />
                </div>

                <label className="flex items-center gap-3 self-end rounded-lg border p-3">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(event) => setIsPublished(event.target.checked)}
                    disabled={submitting}
                    className="size-4 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      Publish immediately
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Published problems can be selected for battles.
                    </span>
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test cases</CardTitle>
              <CardDescription>
                Visible cases become examples. Hidden cases are only used by
                Judge0.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {testCases.map((testCase, index) => (
                <section key={index} className="rounded-xl border p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="font-medium">Test case {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTestCase(index)}
                      disabled={submitting || testCases.length === 1}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`input-${index}`}>Input</Label>
                      <textarea
                        id={`input-${index}`}
                        value={testCase.input}
                        onChange={(event) =>
                          updateTestCase(index, "input", event.target.value)
                        }
                        placeholder="2 3"
                        disabled={submitting}
                        rows={4}
                        spellCheck={false}
                        className="w-full resize-y rounded-lg border border-input bg-muted/20 px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`output-${index}`}>Expected output</Label>
                      <textarea
                        id={`output-${index}`}
                        value={testCase.expectedOutput}
                        onChange={(event) =>
                          updateTestCase(
                            index,
                            "expectedOutput",
                            event.target.value,
                          )
                        }
                        placeholder="5"
                        disabled={submitting}
                        rows={4}
                        spellCheck={false}
                        className="w-full resize-y rounded-lg border border-input bg-muted/20 px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={testCase.isHidden}
                      onChange={(event) =>
                        updateTestCase(index, "isHidden", event.target.checked)
                      }
                      disabled={submitting}
                      className="size-4 accent-primary"
                    />
                    Hide this test case from players
                  </label>
                </section>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addTestCase}
                disabled={submitting}
              >
                Add test case
              </Button>
            </CardContent>

            <CardFooter className="flex flex-wrap justify-between gap-3">
              <div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {createdProblem && (
                  <p className="text-sm font-medium">
                    “{createdProblem.title}” was created successfully.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {createdProblem && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Create another
                  </Button>
                )}
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create problem"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </div>
    </main>
  );
}
