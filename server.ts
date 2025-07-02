// server.ts
import { serve } from "bun";
import os from "os";

// --- Get the first non-internal IPv4 address ---
function getLocalIPv4() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost"; // fallback
}

// --- Parse dev mode flag ---
const isDev = Bun.argv.includes("--dev") || Bun.argv.includes("dev");

// --- Config ---
const port = Number(process.env.PORT) || 3001;
const hostname = getLocalIPv4();

// --- In-memory store for WebSocket connections ---
const canvasConnections = new Map<string, Set<any>>();

// --- WebSocket message handler ---
function handleWebSocketMessage(ws: any, message: any) {
  try {
    const data = JSON.parse(message);
    if (isDev) console.log("📨 WebSocket message:", data);

    switch (data.type) {
      case "join_canvas": {
        const { canvasId, userId } = data;
        ws.canvasId = canvasId;
        ws.userId = userId;

        if (!canvasConnections.has(canvasId)) {
          canvasConnections.set(canvasId, new Set());
        }
        canvasConnections.get(canvasId)!.add(ws);

        const clientCount = canvasConnections.get(canvasId)!.size;
        if (isDev)
          console.log(
            `🔗 Client joined canvas ${canvasId} (${clientCount} total)`
          );

        // Send welcome message
        ws.send(
          JSON.stringify({
            type: "connected",
            data: { canvasId, userId, connectedUsers: clientCount },
          })
        );

        // Broadcast user count update
        broadcastToCanvas(canvasId, {
          type: "user_count_update",
          data: { count: clientCount },
        });
        break;
      }

      case "ping":
        ws.send(JSON.stringify({ type: "pong" }));
        break;
      case 'pixel_placed':
        // This is just a placeholder; actual pixel handling should be elsewhere
        // const pixelData = lastMessage.data as PixelData;
        // setPixels(prev => new Map(prev.set(`${pixelData.x},${pixelData.y}`, pixelData)));
        // console.log('🟩 Pixel placed via WebSocket:', pixelData);
        break;
      case "chat_message": {
        const { canvasId, userId, username, text, timestamp } = data;
        if (!canvasId || !text) return;
        broadcastToCanvas(canvasId, {
          type: "chat_message",
          data: { userId, username, text, timestamp },
        });
        break;
      }
    }
  } catch (error) {
    console.error("❌ Error handling WebSocket message:", error);
  }
}

// --- Broadcast to all clients in a canvas ---
function broadcastToCanvas(canvasId: string, message: any, excludeWs?: any) {
  const connections = canvasConnections.get(canvasId);
  if (!connections) return;

  const messageStr = JSON.stringify(message);
  let successCount = 0;

  connections.forEach((ws) => {
    if (ws !== excludeWs && ws.readyState === 1) {
      // 1 = OPEN
      try {
        ws.send(messageStr);
        successCount++;
      } catch (error) {
        console.error("❌ Error broadcasting to client:", error);
        connections.delete(ws);
      }
    }
  });

  if (isDev)
    console.log(
      `📡 Broadcasted ${message.type} to ${successCount} clients in canvas ${canvasId}`
    );
}

// --- Remove client from canvas on disconnect ---
function removeClient(ws: any) {
  if (ws.canvasId && canvasConnections.has(ws.canvasId)) {
    canvasConnections.get(ws.canvasId)!.delete(ws);
    const remainingClients = canvasConnections.get(ws.canvasId)!.size;

    if (remainingClients === 0) {
      canvasConnections.delete(ws.canvasId);
    } else {
      broadcastToCanvas(ws.canvasId, {
        type: "user_count_update",
        data: { count: remainingClients },
      });
    }

    if (isDev)
      console.log(
        `🔌 Client disconnected from canvas ${ws.canvasId} (${remainingClients} remaining)`
      );
  }
}

// --- Export for API routes (e.g. pixel placement) ---
export { broadcastToCanvas };

// --- Start the WebSocket server ---
type WebSocketData = {
  canvasId?: string;
  userId?: string;
};

serve({
  port,
  hostname,
  async fetch(req, server) {
    const url = new URL(req.url);

    // Only handle /ws for WebSocket upgrade
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req, {
        data: {
          canvasId: url.searchParams.get("canvasId"),
          userId: url.searchParams.get("userId") || "anonymous",
        } as WebSocketData,
      });

      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined; // Upgrade successful
    }

    if (url.pathname === "/broadcast-pixel" && req.method === "POST") {
      const body = await req.json();
      const { canvasId, pixel } = body;
      if (canvasId && pixel) {
        broadcastToCanvas(canvasId, {
          type: "pixel_placed",
          data: pixel,
        });
        return new Response("OK");
      }
      return new Response("Bad Request", { status: 400 });
    }

    // All other requests: 404
    return new Response("Not found", { status: 404 });
  },

  websocket: {
    open(ws: { data?: WebSocketData }) {
      if (isDev) console.log("🔗 WebSocket connection opened");
      // Auto-join if canvasId is present
      if (ws.data?.canvasId) {
        handleWebSocketMessage(
          ws,
          JSON.stringify({
            type: "join_canvas",
            canvasId: ws.data.canvasId,
            userId: ws.data.userId,
          })
        );
      }
    },

    message(ws, message) {
      handleWebSocketMessage(ws, message);
    },

    close(ws) {
      if (isDev) console.log("🔌 WebSocket connection closed");
      removeClient(ws);
    },
  },
});

console.log(
  `🚀 WebSocket server running on ws://${hostname}:${port}/ws (${isDev ? "dev" : "prod"} mode)`
);

import mysql from "mysql2/promise";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "openplace",
  port: parseInt(process.env.DB_PORT || "3306"),
  charset: "utf8mb4",
  timezone: "+00:00",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool: mysql.Pool | null = null;

export async function getConnection(): Promise<mysql.Pool> {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log("Database pool created successfully");
  }
  return pool;
}

export interface CanvasConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  placeCooldown: number;
  password?: string;
  backgroundColor: string;
  gridColor: string;
  showGrid: boolean;
  gridThreshold: number;
  maxZoom: number;
  minZoom: number;
  allowedColors?: string[];
  createdAt: number;
  createdBy?: string;
  showPixelAuthors: "admins" | "everyone";
  pinned?: boolean;
  authMode: "anyone" | "user_or_guest" | "user_only";
}

export interface PixelData {
  x: number;
  y: number;
  color: string;
  timestamp: number;
  user?: string;
  username?: string;
}

export async function getCanvas(id: string): Promise<CanvasConfig | null> {
  const conn = await getConnection();
  const [rows] = await conn.execute(
    "SELECT * FROM canvases WHERE id = ?",
    [id]
  );
  const canvases = rows as any[];
  if (canvases.length === 0) return null;
  const canvas = canvases[0];
  return {
    id: canvas.id,
    name: canvas.name,
    width: canvas.width,
    height: canvas.height,
    placeCooldown: canvas.place_cooldown,
    password: canvas.password,
    backgroundColor: canvas.background_color,
    gridColor: canvas.grid_color,
    showGrid: Boolean(canvas.show_grid),
    gridThreshold: parseFloat(canvas.grid_threshold),
    maxZoom: canvas.max_zoom,
    minZoom: parseFloat(canvas.min_zoom),
    allowedColors: canvas.allowed_colors
      ? JSON.parse(canvas.allowed_colors)
      : undefined,
    createdAt: new Date(canvas.created_at).getTime(),
    createdBy: canvas.created_by,
    showPixelAuthors: canvas.show_pixel_authors || "admins",
    pinned: Boolean(canvas.pinned),
    authMode: canvas.auth_mode || "anyone",
  };
}

export async function createCanvas(
  config: Omit<CanvasConfig, "createdAt">
): Promise<void> {
  const conn = await getConnection();
  await conn.execute(
    `INSERT INTO canvases (
      id, name, width, height, place_cooldown, password, 
      background_color, grid_color, show_grid, grid_threshold, 
      max_zoom, min_zoom, allowed_colors, created_by, show_pixel_authors, auth_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      config.id,
      config.name,
      config.width,
      config.height,
      config.placeCooldown,
      config.password || null,
      config.backgroundColor,
      config.gridColor,
      config.showGrid ? 1 : 0,
      config.gridThreshold,
      config.maxZoom,
      config.minZoom,
      config.allowedColors ? JSON.stringify(config.allowedColors) : null,
      config.createdBy || null,
      config.showPixelAuthors || "admins",
      config.authMode || "anyone",
    ]
  );
}

export async function getCanvasPixels(
  canvasId: string
): Promise<PixelData[]> {
  const conn = await getConnection();
  const [rows] = await conn.execute(
    "SELECT x, y, color, timestamp, user_id, username FROM pixels WHERE canvas_id = ?",
    [canvasId]
  );
  const pixels = rows as any[];
  return pixels.map((pixel) => ({
    x: pixel.x,
    y: pixel.y,
    color: pixel.color,
    timestamp: new Date(pixel.timestamp).getTime(),
    user: pixel.user_id,
    username: pixel.username,
  }));
}

export async function placePixel(
  canvasId: string,
  x: number,
  y: number,
  color: string,
  userId?: string,
  username?: string
): Promise<void> {
  const conn = await getConnection();
  await conn.execute(
    `INSERT INTO pixels (canvas_id, x, y, color, user_id, username) 
     VALUES (?, ?, ?, ?, ?, ?) 
     ON DUPLICATE KEY UPDATE 
     color = VALUES(color), 
     timestamp = CURRENT_TIMESTAMP, 
     user_id = VALUES(user_id),
     username = VALUES(username)`,
    [canvasId, x, y, color, userId || null, username || null]
  );
  const pixelData: PixelData = {
    x,
    y,
    color,
    timestamp: Date.now(),
    user: userId,
    username,
  };
  await fetch("http://localhost:3001/broadcast-pixel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      canvasId: canvasId,
      pixel: pixelData,
    }),
  });
}

export async function getAllCanvases(): Promise<CanvasConfig[]> {
  const conn = await getConnection();
  const [rows] = await conn.execute(
    "SELECT * FROM canvases ORDER BY created_at DESC"
  );
  const canvases = rows as any[];
  return canvases.map((canvas) => ({
    id: canvas.id,
    name: canvas.name,
    width: canvas.width,
    height: canvas.height,
    placeCooldown: canvas.place_cooldown,
    password: canvas.password,
    backgroundColor: canvas.background_color,
    gridColor: canvas.grid_color,
    showGrid: Boolean(canvas.show_grid),
    gridThreshold: parseFloat(canvas.grid_threshold),
    maxZoom: canvas.max_zoom,
    minZoom: parseFloat(canvas.min_zoom),
    allowedColors: canvas.allowed_colors
      ? JSON.parse(canvas.allowed_colors)
      : undefined,
    createdAt: new Date(canvas.created_at).getTime(),
    createdBy: canvas.created_by,
    showPixelAuthors: canvas.show_pixel_authors || "admins",
    pinned: Boolean(canvas.pinned),
    authMode: canvas.auth_mode || "anyone",
  }));
}

export async function testConnection(): Promise<boolean> {
  try {
    const conn = await getConnection();
    await conn.execute("SELECT 1");
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}