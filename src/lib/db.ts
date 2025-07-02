import mysql from "mysql2/promise";
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

const dbConfig = {
  host: process.env.DB_HOST || getLocalIPv4(),
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
  await fetch(`http://${getLocalIPv4()}:3001/broadcast-pixel`, {
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