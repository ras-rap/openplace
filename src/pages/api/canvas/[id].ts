// pages/api/canvas/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getCanvas, getCanvasPixels } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid canvas ID' });
  }

  if (req.method === 'GET') {
    try {
      const canvas = await getCanvas(id);
      if (!canvas) {
        return res.status(404).json({ error: 'Canvas not found' });
      }

      const pixels = await getCanvasPixels(id);
      
      res.status(200).json({
        canvas,
        pixels,
      });
    } catch (error) {
      console.error('Error fetching canvas:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}