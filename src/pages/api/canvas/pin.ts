// pages/api/canvas/pin.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { id, pinned } = req.body;
  if (!id || typeof pinned !== "boolean") {
    return res.status(400).json({ error: "Invalid request" });
  }
  try {
    const conn = await getConnection();
    await conn.execute(
      "UPDATE canvases SET pinned = ? WHERE id = ?",
      [pinned ? 1 : 0, id]
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update pin status" });
  }
}