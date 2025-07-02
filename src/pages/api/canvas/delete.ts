// pages/api/canvas/delete.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getConnection } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Invalid request" });
  }
  try {
    const conn = await getConnection();
    await conn.execute("DELETE FROM canvases WHERE id = ?", [id]);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete canvas" });
  }
}