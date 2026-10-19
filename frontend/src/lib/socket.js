import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

export function createSocketConnection(sessionToken) {
  return io(SOCKET_URL, {
    auth: {
      sessionToken,
    },
    transports: ["websocket"],
    autoConnect: true,
  });
}
