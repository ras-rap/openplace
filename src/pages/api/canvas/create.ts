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
      showPixelAuthors,
      userName,
      userId,
    } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Canvas name is required' });
    }

    if (
      typeof width !== "number" ||
      typeof height !== "number" ||
      width < 10 ||
      width > 5000 ||
      height < 10 ||
      height > 5000
    ) {
      return res.status(400).json({ error: 'Invalid canvas dimensions' });
    }

    // Use 0 as a valid value for placeCooldown
    const cooldown =
      typeof placeCooldown === "number" && placeCooldown >= 0
        ? placeCooldown
        : 5;

    // Assign createdBy: name > id > anon
    const createdBy =
      (typeof userName === "string" && userName.trim()) ? userName.trim()
      : (typeof userId === "string" && userId.trim()) ? userId.trim()
      : "anon";

    const canvasId = nanoid(12);

    await createCanvas({
      id: canvasId,
      name: name.trim(),
      width,
      height,
      placeCooldown: cooldown,
      password: password || undefined,
      backgroundColor: backgroundColor || '#FFFFFF',
      gridColor: gridColor || '#E0E0E0',
      showGrid: showGrid !== false,
      gridThreshold: typeof gridThreshold === "number" ? gridThreshold : 4,
      maxZoom: typeof maxZoom === "number" ? maxZoom : 32,
      minZoom: typeof minZoom === "number" ? minZoom : 0.1,
      allowedColors: allowedColors || undefined,
      createdBy,
      showPixelAuthors: showPixelAuthors === "everyone" ? "everyone" : "admins",
    });

    res.status(201).json({ canvasId });
  } catch (error) {
    console.error('Error creating canvas:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}