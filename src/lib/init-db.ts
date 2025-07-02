// lib/init-db.ts
import { getConnection } from './db';

export async function initializeDatabase() {
  const conn = await getConnection();

  // Create users table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      pixels_placed INT NOT NULL DEFAULT 0,
      time_spent_seconds INT NOT NULL DEFAULT 0,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

 

  // Create user_accounts table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS user_accounts (
      provider VARCHAR(32) NOT NULL,
      provider_user_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      PRIMARY KEY (provider, provider_user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create sessions table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

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
        created_by VARCHAR(255),
        show_pixel_authors VARCHAR(16) NOT NULL DEFAULT 'admins'
      )
    `);

     // Add pinned column to canvases table if it doesn't exist
  await conn.execute(`
    ALTER TABLE canvases ADD COLUMN IF NOT EXISTS pinned TINYINT(1) DEFAULT 0;
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