// pages/api/canvas/explore.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getAllCanvases } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const canvases = await getAllCanvases();
    // Only return public canvases (no password)
    const publicCanvases = canvases.filter(
      (c) => !c.password || c.password === ''
    );
    res.status(200).json({ canvases: publicCanvases });
  } catch (error) {
    console.error('Error fetching canvases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}