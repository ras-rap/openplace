// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { account, ID } from "@/lib/appwrite";
import type { Models } from "appwrite";

type AuthUser = Models.User<Models.Preferences> | null;

interface AuthContextType {
  user: AuthUser;
  loading: boolean;
  isAdmin: boolean;
  loginWithProvider: (provider: import("appwrite").OAuthProvider) => void;
  loginAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  loginWithProvider: () => {},
  loginAnonymously: async () => {},
  logout: async () => {},
  refresh: async () => {},
  showAuthModal: false,
  setShowAuthModal: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const user = await account.get();
      setUser(user);
    } catch {
      setUser(null);
    }
    setLoading(false);
  };

  const loginWithProvider = (provider: import("appwrite").OAuthProvider) => {
    const redirect = window.location.origin + "/auth-callback";
    account.createOAuth2Session(provider, redirect, redirect);
  };

  async function loginAnonymously(username?: string) {
  setLoading(true);
  try {
    const session = await account.createAnonymousSession();
    if (username) {
      // Set the username in Appwrite preferences or update the user
      await account.updateName(username);
    }
    await refresh();
    setShowAuthModal(false);
  } catch (e) {}
  setLoading(false);
}

  const logout = async () => {
    setLoading(true);
    try {
      await account.deleteSession("current");
      setUser(null);
    } catch (e) {}
    setLoading(false);
  };

  // --- ADMIN DETECTION ---
  const isAdmin =
    !!user &&
    Array.isArray((user as any).labels) &&
    (user as any).labels.includes("admin");

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        loginWithProvider,
        loginAnonymously,
        logout,
        refresh,
        showAuthModal,
        setShowAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
export type OAuthProvider = "discord" | "github";