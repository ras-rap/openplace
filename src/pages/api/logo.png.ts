// pages/api/logo.png.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createCanvas } from "canvas";
import { getCanvas, getCanvasPixels } from "@/lib/db";
import { LOGO_CANVAS_ID, LOGO_SIZE } from "@/lib/site-config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const canvasId = LOGO_CANVAS_ID;
  const size = LOGO_SIZE;

  const canvasConfig = await getCanvas(canvasId);
  if (!canvasConfig) {
    res.status(404).send("Logo canvas not found");
    return;
  }
  const pixels = await getCanvasPixels(canvasId);

  // Render to a square of LOGO_SIZE x LOGO_SIZE
  const c = createCanvas(size, size);
  const ctx = c.getContext("2d");

  // Fill background
  ctx.fillStyle = canvasConfig.backgroundColor || "#fff";
  ctx.fillRect(0, 0, size, size);

  // Scale pixels to fit
  const scaleX = size / canvasConfig.width;
  const scaleY = size / canvasConfig.height;

  for (const pixel of pixels) {
    ctx.fillStyle = pixel.color;
    ctx.fillRect(
      Math.floor(pixel.x * scaleX),
      Math.floor(pixel.y * scaleY),
      Math.ceil(scaleX),
      Math.ceil(scaleY)
    );
  }

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=60"); // cache for 1 minute
  c.pngStream().pipe(res as any);
}