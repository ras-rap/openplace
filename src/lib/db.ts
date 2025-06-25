// lib/db.ts (updated version)
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'openplace',
  port: parseInt(process.env.DB_PORT || '3306'),
  // Add connection options for better compatibility
  charset: 'utf8mb4',
  timezone: '+00:00',
};

let connection: mysql.Connection | null = null;

export async function getConnection() {
  if (!connection) {
    try {
      connection = await mysql.createConnection(dbConfig);
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }
  return connection;
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
}

export interface PixelData {
  x: number;
  y: number;
  color: string;
  timestamp: number;
  user?: string;
}

export async function getCanvas(id: string): Promise<CanvasConfig | null> {
  const conn = await getConnection();
  const [rows] = await conn.execute(
    'SELECT * FROM canvases WHERE id = ?',
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
    allowedColors: canvas.allowed_colors ? JSON.parse(canvas.allowed_colors) : undefined,
    createdAt: new Date(canvas.created_at).getTime(),
    createdBy: canvas.created_by,
  };
}

export async function createCanvas(config: Omit<CanvasConfig, 'createdAt'>): Promise<void> {
  const conn = await getConnection();
  await conn.execute(
    `INSERT INTO canvases (
      id, name, width, height, place_cooldown, password, 
      background_color, grid_color, show_grid, grid_threshold, 
      max_zoom, min_zoom, allowed_colors, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      config.id,
      config.name,
      config.width,
      config.height,
      config.placeCooldown,
      config.password || null,
      config.backgroundColor,
      config.gridColor,
      config.showGrid ? 1 : 0, // Convert boolean to integer for MySQL
      config.gridThreshold,
      config.maxZoom,
      config.minZoom,
      config.allowedColors ? JSON.stringify(config.allowedColors) : null,
      config.createdBy || null,
    ]
  );
}

export async function getCanvasPixels(canvasId: string): Promise<PixelData[]> {
  const conn = await getConnection();
  const [rows] = await conn.execute(
    'SELECT x, y, color, timestamp, user_id FROM pixels WHERE canvas_id = ?',
    [canvasId]
  );
  
  const pixels = rows as any[];
  return pixels.map(pixel => ({
    x: pixel.x,
    y: pixel.y,
    color: pixel.color,
    timestamp: new Date(pixel.timestamp).getTime(),
    user: pixel.user_id,
  }));
}

export async function placePixel(
  canvasId: string,
  x: number,
  y: number,
  color: string,
  userId?: string
): Promise<void> {
  const conn = await getConnection();
  await conn.execute(
    `INSERT INTO pixels (canvas_id, x, y, color, user_id) 
     VALUES (?, ?, ?, ?, ?) 
     ON DUPLICATE KEY UPDATE 
     color = VALUES(color), 
     timestamp = CURRENT_TIMESTAMP, 
     user_id = VALUES(user_id)`,
    [canvasId, x, y, color, userId || null]
  );
}

export async function getAllCanvases(): Promise<CanvasConfig[]> {
  const conn = await getConnection();
  const [rows] = await conn.execute(
    'SELECT * FROM canvases ORDER BY created_at DESC'
  );
  
  const canvases = rows as any[];
  return canvases.map(canvas => ({
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
    allowedColors: canvas.allowed_colors ? JSON.parse(canvas.allowed_colors) : undefined,
    createdAt: new Date(canvas.created_at).getTime(),
    createdBy: canvas.created_by,
  }));
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const conn = await getConnection();
    await conn.execute('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}