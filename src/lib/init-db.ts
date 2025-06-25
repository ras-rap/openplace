// lib/init-db.ts
import { getConnection } from './db';

export async function initializeDatabase() {
  const conn = await getConnection();
  
  try {
    // Create canvases table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS canvases (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        place_cooldown INTEGER NOT NULL DEFAULT 5,
        password VARCHAR(255),
        background_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
        grid_color VARCHAR(7) NOT NULL DEFAULT '#E0E0E0',
        show_grid BOOLEAN NOT NULL DEFAULT true,
        grid_threshold DECIMAL(3,1) NOT NULL DEFAULT 4.0,
        max_zoom INTEGER NOT NULL DEFAULT 32,
        min_zoom DECIMAL(3,2) NOT NULL DEFAULT 0.1,
        allowed_colors TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255)
      )
    `);

    // Create pixels table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS pixels (
        canvas_id VARCHAR(255) NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        color VARCHAR(7) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id VARCHAR(255),
        PRIMARY KEY (canvas_id, x, y),
        FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await conn.execute(`
      CREATE INDEX IF NOT EXISTS idx_pixels_canvas_id ON pixels(canvas_id)
    `);
    
    await conn.execute(`
      CREATE INDEX IF NOT EXISTS idx_pixels_timestamp ON pixels(timestamp)
    `);

    console.log('Database tables created successfully');
    return { success: true };
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
}