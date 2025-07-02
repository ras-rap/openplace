import { NextApiRequest, NextApiResponse } from "next";
import { getCanvas, placePixel } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

// In-memory cooldown store (use Redis for production)
const cooldowns = new Map<string, number>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  const { x, y, color } = req.body;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid canvas ID" });
  }

  const canvas = await getCanvas(id);
  if (!canvas) {
    return res.status(404).json({ error: "Canvas not found" });
  }

  // --- AUTH CHECK ---
  let user = null;
  if (canvas.authMode === "user_only" || canvas.authMode === "user_or_guest") {
    user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    if (canvas.authMode === "user_only" && user.isGuest)
      return res.status(403).json({ error: "OAuth login required" });
  } else {
    // For "anyone", allow anonymous, but try to get user if present
    user = await getUserFromRequest(req);
  }

  // --- COOLDOWN CHECK ---
  const userId = user?.userId || "anon";
  const cooldownKey = `${id}:${userId}`;
  const now = Date.now();
  const last = cooldowns.get(cooldownKey) || 0;
  if (now - last < canvas.placeCooldown * 1000) {
    return res.status(429).json({ error: "Cooldown in effect" });
  }
  cooldowns.set(cooldownKey, now);

  // --- Place pixel ---
  await placePixel(id, x, y, color, userId, user?.username || "anon");

  res.status(200).json({ success: true });
}