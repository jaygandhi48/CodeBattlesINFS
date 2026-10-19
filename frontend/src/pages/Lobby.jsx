import { Button } from "@/components/ui/button";
import { useState } from "react";
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

import { createPlayer, joinBattle } from "../api/index.js";
import { useNavigate } from "react-router-dom";

export function Lobby() {
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedRoomCode = roomCode.trim().toUpperCase();

    if (!displayName.trim()) {
      setError("Enter a display name.");
      return;
    }

    if (normalizedRoomCode.length !== 6) {
      setError("Enter a six-character room code.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const player = await createPlayer(displayName.trim());

      sessionStorage.setItem("player", JSON.stringify(player));
      const battle = await joinBattle(normalizedRoomCode, player.sessionToken);
      navigate(`/battles/${normalizedRoomCode}`);
      console.log("Player created:", player);
      console.log("battle:", battle);
      console.log("Room code:", normalizedRoomCode);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  const navigate = useNavigate();
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">CodeBattles</h1>

          <p className="mt-2 text-muted-foreground">
            Compete, solve problems, and beat your opponent in real time.
          </p>
        </div>

        <Card className="border-border/70 shadow-xl">
          <CardHeader className="space-y-2 px-8 pt-8">
            <CardTitle className="text-2xl">Join a coding battle</CardTitle>

            <CardDescription className="text-base">
              Enter your display name and room code to join an existing battle.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 px-8 py-7">
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>

                <Input
                  id="name"
                  name="displayName"
                  type="text"
                  placeholder="vibeCoder67"
                  className="h-12 text-base"
                  required
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                  }}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roomCode">Room code</Label>

                <Input
                  id="roomCode"
                  name="roomCode"
                  type="text"
                  placeholder="A1B2C3"
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value)}
                  disabled={loading}
                  maxLength={6}
                  className="h-12 font-mono text-base uppercase tracking-widest"
                  required
                />

                <p className="text-sm text-muted-foreground">
                  Ask the battle host for their six-character room code.
                </p>
              </div>
            </CardContent>
            {error && (
              <p className="px-8 pb-4 text-sm text-destructive">{error}</p>
            )}
            <CardFooter className="flex flex-col gap-3 px-8 pb-8">
              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full text-base"
              >
                {loading ? "Joining..." : "Join Battle"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-12 w-full text-base"
                onClick={() => navigate("/create")}
              >
                Create a battle instead
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/admin/problems/new")}
              >
                Admin: create a problem
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ready to prove your coding skills?
        </p>
      </div>
    </main>
  );
}
