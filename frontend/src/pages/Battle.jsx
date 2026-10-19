import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";

import { Button } from "@/components/ui/button";
import { getBattle, submitSolution } from "../api/index.js";
import { createSocketConnection } from "@/lib/socket.js";

export function Battle() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [battle, setBattle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socketStatus, setSocketStatus] = useState("connecting");
  const [yourSubmission, setYourSubmission] = useState(null);
  const [opponentSubmission, setOpponentSubmission] = useState(null);
  const [sourceCode, setSourceCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  async function submissionHandler() {
    if (!sourceCode.trim() || submitting || battle.status != "ACTIVE") {
      return;
    }
    const storedPlayer = sessionStorage.getItem("player");

    if (!storedPlayer) {
      setSubmissionError("Your player session is missing.");
      return;
    }
    try {
      setSubmitting(true);
      setSubmissionError("");
      const player = JSON.parse(storedPlayer);
      const res = await submitSolution(
        roomCode,
        sourceCode,
        player.sessionToken,
      );
      setYourSubmission(res);
    } catch (e) {
      setSubmissionError(e.message);
    } finally {
      setSubmitting(false);
    }
  }
  useEffect(() => {
    const storedPlayer = sessionStorage.getItem("player");
    if (!storedPlayer) {
      return;
    }
    const player = JSON.parse(storedPlayer);
    const socket = createSocketConnection(player.sessionToken);

    const updateSubmissionStatus = (submission) => {
      if (submission.playerId === player.id) {
        setYourSubmission(submission);
      } else {
        setOpponentSubmission(submission);
      }
    };

    socket.on("connect", () => {
      setSocketStatus("connected");
      socket.emit("battle:join", { roomCode: roomCode }, (res) => {
        if (!res?.success) {
          setError(res?.error ?? "Unable to join the live battle.");
          return;
        }
      });
    });

    socket.on("connect_error", (error) => {
      setSocketStatus("error");
      setError(error.message);
    });

    socket.on("disconnect", () => {
      setSocketStatus("disconnected");
    });

    socket.on("battle:started", (e) => {
      setBattle((curr) => ({
        ...curr,
        status: e.status,
        version: e.version,
        players: e.players,
        startedAt: e.startedAt,
      }));
    });

    socket.on("submission:judging", (e) => {
      updateSubmissionStatus(e);
    });

    socket.on("submission:completed", (e) => {
      updateSubmissionStatus(e);
    });

    socket.on("battle:finished", (event) => {
      setBattle((currentBattle) => ({
        ...currentBattle,
        status: event.status,
        version: event.version,
        winnerId: event.winnerId,
        finishedAt: event.finishedAt,
      }));
    });

    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [roomCode]);
  useEffect(() => {
    async function loadBattle() {
      const storedPlayer = sessionStorage.getItem("player");

      if (!storedPlayer) {
        navigate("/");
        return;
      }

      try {
        const player = JSON.parse(storedPlayer);

        const battleData = await getBattle(roomCode, player.sessionToken);

        setBattle(battleData);
        setSourceCode(
          (currentCode) => currentCode || battleData.problem.starterCode || "",
        );
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadBattle();
  }, [roomCode, navigate]);

  if (loading) {
    return <p className="p-8">Loading battle...</p>;
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <section className="w-full max-w-md rounded-xl border bg-background p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Unable to open this battle</h1>
          <p className="mt-2 text-sm text-destructive">{error}</p>
          <Button className="mt-6" onClick={() => navigate("/")}>
            Back to lobby
          </Button>
        </section>
      </main>
    );
  }

  const visibleTestCases = (battle.problem.testCases ?? []).filter(
    (testCase) => testCase.isHidden !== true,
  );
  const storedPlayer = sessionStorage.getItem("player");
  const currentPlayerId = storedPlayer ? JSON.parse(storedPlayer).id : null;
  const opponent = battle.players.find(
    (member) => member.playerId !== currentPlayerId,
  );
  const winner = battle.players.find(
    (member) => member.playerId === battle.winnerId,
  );
  const currentPlayerWon = battle.winnerId === currentPlayerId;

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Room {battle.roomCode}
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              CodeBattles
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
            <span className="rounded-full border bg-muted px-3 py-1 font-medium">
              {battle.status}
            </span>
            <span
              className={`rounded-full px-3 py-1 font-medium ${
                socketStatus === "connected"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {socketStatus === "connected" ? "Live" : socketStatus}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
            >
              Back to lobby
            </Button>
          </div>
        </div>
      </header>

      {battle.status === "FINISHED" && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <section className="rounded-xl border bg-background p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Battle result
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  {currentPlayerWon
                    ? "You won the battle!"
                    : winner
                      ? `${winner.player.displayName} won the battle`
                      : "The battle has ended"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentPlayerWon
                    ? "Your solution passed all test cases first."
                    : winner
                      ? "They submitted the first accepted solution."
                      : "No winner was recorded."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  FINISHED
                </span>
                <Button type="button" onClick={() => navigate("/create")}>
                  Start another battle
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
        <section className="rounded-xl border bg-background p-6 shadow-sm">
          <div className="border-b pb-5">
            <p className="text-sm font-medium text-muted-foreground">Problem</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {battle.problem.title}
            </h2>
          </div>

          <div className="py-6">
            <p className="leading-7 text-foreground">
              {battle.problem.description}
            </p>

            {visibleTestCases.length > 0 && (
              <div className="mt-7 space-y-4">
                <h3 className="font-semibold">Examples</h3>

                {visibleTestCases.map((testCase, index) => (
                  <div
                    key={testCase.id}
                    className="space-y-3 rounded-lg border bg-muted/30 p-4"
                  >
                    <p className="text-sm font-medium">Example {index + 1}</p>

                    <div>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Input
                      </p>
                      <pre className="overflow-x-auto rounded-md border bg-background p-3 font-mono text-sm whitespace-pre-wrap">
                        {testCase.input}
                      </pre>
                    </div>

                    <div>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Expected output
                      </p>
                      <pre className="overflow-x-auto rounded-md border bg-background p-3 font-mono text-sm whitespace-pre-wrap">
                        {testCase.expectedOutput}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 rounded-lg bg-muted/60 p-4">
              <p className="text-sm font-medium">Execution limit</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {battle.problem.timeLimitMs} ms
              </p>
            </div>
          </div>

          <div className="border-t pt-5">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Players
            </p>
            <div className="flex flex-wrap gap-2">
              {battle.players.map((member) => (
                <span
                  key={member.playerId}
                  className="rounded-full border bg-muted px-3 py-1.5 text-sm font-medium"
                >
                  {member.player.displayName}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <p className="font-medium">Solution</p>
              <p className="text-sm text-muted-foreground">Python 3</p>
            </div>

            <Button
              type="button"
              onClick={submissionHandler}
              disabled={
                battle.status !== "ACTIVE" || !sourceCode.trim() || submitting
              }
            >
              {submitting ? "Submitting..." : "Submit solution"}
            </Button>
          </div>

          <Editor
            height="65vh"
            language="python"
            theme="vs-dark"
            value={sourceCode}
            onChange={(value) => setSourceCode(value ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbersMinChars: 3,
              padding: { top: 18 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />

          <div className="grid gap-3 border-t bg-muted/20 p-4 sm:grid-cols-2">
            <section className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/30">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Your submission
              </p>
              <p className="mt-2 text-sm font-medium">
                {yourSubmission?.status?.replaceAll("_", " ") ??
                  "No submission yet"}
              </p>
              {yourSubmission?.testsTotal > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {yourSubmission.testsPassed}/{yourSubmission.testsTotal} tests
                  passed
                </p>
              )}
            </section>

            <section className="rounded-lg border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/30">
              <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                {opponent
                  ? `${opponent.player.displayName}'s submission`
                  : "Opponent activity"}
              </p>
              <p className="mt-2 text-sm font-medium">
                {opponentSubmission?.status?.replaceAll("_", " ") ??
                  "No submission yet"}
              </p>
              {opponentSubmission?.testsTotal > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {opponentSubmission.testsPassed}/
                  {opponentSubmission.testsTotal} tests passed
                </p>
              )}
            </section>
          </div>

          {submissionError && (
            <div className="border-t px-5 py-3 text-sm text-destructive">
              {submissionError}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
