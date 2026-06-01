import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { logger } from "./logger";

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    logger.info("WebSocket client connected");
    ws.on("close", () => logger.info("WebSocket client disconnected"));
    ws.on("error", (err) => logger.error({ err }, "WebSocket error"));
  });

  logger.info("WebSocket server running at /ws");
}

export function broadcastPixel(pixel: {
  x: number;
  y: number;
  color: string;
  username: string;
  userId: number;
}) {
  if (!wss) return;
  const msg = JSON.stringify({ type: "pixel", ...pixel });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}
