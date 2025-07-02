// lib/auth.ts
import { account } from "@/lib/appwrite"; // or your Appwrite SDK setup
import type { NextApiRequest } from "next";
import { Models } from "appwrite";

export interface AuthUser {
  userId: string;
  username: string;
  isGuest: boolean;
  isOAuth: boolean;
  sessionId?: string;
}

export async function getUserFromRequest(req: NextApiRequest): Promise<AuthUser | null> {
  // Example: get session from cookie (customize for your setup)
  const cookie = req.headers.cookie || "";
  const sessionMatch = cookie.match(/a_session_(\w+)=([^;]+)/);
  if (!sessionMatch) return null;
  const sessionId = sessionMatch[2];

  try {
    // Use Appwrite SDK to get user from session
    const user: Models.User<Models.Preferences> = await account.get();
    const isGuest = user.email === undefined && user.name?.startsWith("Guest");
    return {
      userId: user.$id,
      username: user.name || `Guest${user.$id.slice(-4)}`,
      isGuest,
      isOAuth: !isGuest,
      sessionId,
    };
  } catch {
    return null;
  }
}