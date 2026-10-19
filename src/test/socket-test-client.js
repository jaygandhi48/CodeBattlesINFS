import { io } from "socket.io-client";

const [
  ,
  ,
  playerName,
  sessionToken,
  roomCode,
  serverUrl = "http://localhost:3000",
] = process.argv;

if (!playerName || !sessionToken || !roomCode) {
  console.error(
    "Usage: node src/test/socket-test-client.js <name> <token> <roomCode> <serverUrl>",
  );
  process.exit(1);
}

const socket = io(serverUrl, {
  auth: {
    sessionToken,
  },
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log(`${playerName} connected to ${serverUrl}`);
  console.log(`Socket ID: ${socket.id}`);

  socket.emit("battle:join", { roomCode }, (response) => {
    console.log("battle:join response:", response);
  });
});

socket.on("connect_error", (error) => {
  console.error("Connection rejected:", error.message);
});

socket.on("submission:judging", (data) => {
  console.log("submission:judging", data);
});

socket.on("submission:completed", (data) => {
  console.log("submission:completed", data);
});

socket.on("battle:finished", (data) => {
  console.log("battle:finished", data);
});

socket.on("disconnect", (reason) => {
  console.log(`${playerName} disconnected: ${reason}`);
});
