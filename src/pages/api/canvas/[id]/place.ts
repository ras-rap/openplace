// pages/api/canvas/[id]/place.ts (fixed)
import { NextApiRequest, NextApiResponse } from 'next';
import { getCanvas, placePixel } from '@/lib/db';
import { getWebSocketServer } from '@/lib/websocket';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { x, y, color, userId } = req.body;

  console.log('🎨 Pixel placement request:', { id, x, y, color, userId });

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid canvas ID' });
  }

  // Validate input
  if (typeof x !== 'number' || typeof y !== 'number' || typeof color !== 'string') {
    return res.status(400).json({ error: 'Invalid pixel data' });
  }

  try {
    const canvas = await getCanvas(id);
    if (!canvas) {
      return res.status(404).json({ error: 'Canvas not found' });
    }

    // Validate coordinates
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Validate color format
    if (!/^#[0-9A-Fa-f]{6}$/i.test(color)) {
      return res.status(400).json({ error: 'Invalid color format' });
    }

    // Check if color is allowed
    if (canvas.allowedColors && !canvas.allowedColors.includes(color.toUpperCase())) {
      return res.status(400).json({ error: 'Color not allowed' });
    }

    // Place the pixel in database
    await placePixel(id, x, y, color, userId);
    console.log('✅ Pixel placed in database');

    // Broadcast to WebSocket clients
    try {
      const wss = getWebSocketServer();
      const pixelData = {
        x,
        y,
        color,
        timestamp: Date.now(),
        user: userId,
      };

      wss.broadcast(id, {
        type: 'pixel_placed',
        data: pixelData,
      });
      console.log('✅ Pixel update broadcasted');
    } catch (wsError) {
      console.error('⚠️ Failed to broadcast pixel update:', wsError);
      // Don't fail the request if WebSocket broadcast fails
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error placing pixel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}