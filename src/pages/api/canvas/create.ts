// pages/api/canvas/create.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createCanvas } from '@/lib/db';
import { nanoid } from 'nanoid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      name,
      width,
      height,
      placeCooldown,
      password,
      backgroundColor,
      gridColor,
      showGrid,
      gridThreshold,
      maxZoom,
      minZoom,
      allowedColors,
    } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Canvas name is required' });
    }

    if (!width || !height || width < 10 || width > 5000 || height < 10 || height > 5000) {
      return res.status(400).json({ error: 'Invalid canvas dimensions' });
    }

    const canvasId = nanoid(12);
    
    await createCanvas({
      id: canvasId,
      name: name.trim(),
      width,
      height,
      placeCooldown: placeCooldown || 5,
      password: password || undefined,
      backgroundColor: backgroundColor || '#FFFFFF',
      gridColor: gridColor || '#E0E0E0',
      showGrid: showGrid !== false,
      gridThreshold: gridThreshold || 4,
      maxZoom: maxZoom || 32,
      minZoom: minZoom || 0.1,
      allowedColors: allowedColors || undefined,
      createdBy: 'anonymous', // TODO: Replace with actual user ID
    });

    res.status(201).json({ canvasId });
  } catch (error) {
    console.error('Error creating canvas:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}