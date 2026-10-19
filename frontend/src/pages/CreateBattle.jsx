import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createBattle, createPlayer, getProblems } from "../api/index.js";

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

export function CreateBattle() {
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [problems, setProblems] = useState([]);
  const [problemId, setProblemId] = useState("");
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProblems() {
      try {
        setError("");
        const problemData = await getProblems();
        setProblems(problemData);
        if (problemData.length > 0) {
          setProblemId(problemData[0].id);
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoadingProblems(false);
      }
    }
    loadProblems();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!displayName.trim()) {
      setError("Enter a display name.");
      return;
    }

    if (!problemId) {
      setError("Select a problem.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const player = await createPlayer(displayName.trim());

      sessionStorage.setItem("player", JSON.stringify(player));

      const battle = await createBattle(problemId, player.sessionToken);

      sessionStorage.setItem("battle", JSON.stringify(battle));

      navigate(`/battles/${battle.roomCode}`);
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedProblem = problems.find((problem) => problem.id === problemId);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create a battle</h1>

          <p className="mt-2 text-muted-foreground">
            Choose a problem and invite another player using the generated room
            code.
          </p>
        </div>

        <Card className="border-border/70 shadow-xl">
          <CardHeader className="space-y-2 px-8 pt-8">
            <CardTitle className="text-2xl">Battle details</CardTitle>

            <CardDescription className="text-base">
              You will become player one and the battle host.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 px-8 py-7">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>

                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="vibeCoder67"
                  disabled={submitting}
                  className="h-12 text-base"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="problem">Problem</Label>

                <select
                  id="problem"
                  value={problemId}
                  onChange={(event) => setProblemId(event.target.value)}
                  disabled={loadingProblems || submitting}
                  className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingProblems && (
                    <option value="">Loading problems...</option>
                  )}

                  {!loadingProblems && problems.length === 0 && (
                    <option value="">No problems available</option>
                  )}

                  {problems.map((problem) => (
                    <option key={problem.id} value={problem.id}>
                      {problem.title}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProblem && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h2 className="font-medium">{selectedProblem.title}</h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedProblem.description}
                  </p>

                  <p className="mt-3 text-sm">
                    Time limit: {selectedProblem.timeLimitMs}ms
                  </p>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>

            <CardFooter className="flex gap-3 px-8 pb-8">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1"
                onClick={() => navigate("/")}
                disabled={submitting}
              >
                Back
              </Button>

              <Button
                type="submit"
                className="h-12 flex-1"
                disabled={
                  submitting || loadingProblems || problems.length === 0
                }
              >
                {submitting ? "Creating..." : "Create battle"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}
