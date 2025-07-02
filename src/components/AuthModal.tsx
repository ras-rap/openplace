import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  IconBrandGithub,
  IconBrandDiscord,
  IconUser,
  IconX,
  IconLoader2,
} from "@tabler/icons-react";
import React, { useState } from "react";

export default function AuthModal({ forceOpen = false }: { forceOpen?: boolean }) {
  const {
    user,
    loading,
    loginWithProvider,
    loginAnonymously,
    logout,
    showAuthModal,
    setShowAuthModal,
  } = useAuth();

  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestError, setGuestError] = useState("");

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simple validation
    if (!guestName.trim()) {
      setGuestError("Please enter a username.");
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(guestName)) {
      setGuestError("3-20 chars, letters, numbers, underscores only.");
      return;
    }
    setGuestError("");
    await loginAnonymously(guestName.trim());
    setShowGuestForm(false);
  };

  // Only show if modal is open or forced open
  if (!showAuthModal && !forceOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-900">
        {!forceOpen && (
          <button
            className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setShowAuthModal(false)}
            aria-label="Close"
          >
            <IconX className="h-5 w-5" />
          </button>
        )}
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold">
            {user ? `Welcome, ${user.name || user.email || "User"}` : "Sign In / Register"}
          </h2>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            {user
              ? "You're signed in. Start creating or joining canvases!"
              : "Log in or create an account to unlock your canvas."}
          </p>
        </div>
        <div>
          {loading ? (
            <div className="flex justify-center py-8">
              <IconLoader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : user ? (
            <Button className="w-full" onClick={logout}>
              Log Out
            </Button>
          ) : showGuestForm ? (
            <form onSubmit={handleGuestSubmit} className="space-y-4">
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="Pick a guest username"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                maxLength={20}
                autoFocus
              />
              {guestError && (
                <div className="text-red-600 text-sm">{guestError}</div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowGuestForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Continue as Guest
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <Button
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
                onClick={() => loginWithProvider("discord")}
              >
                <IconBrandDiscord className="h-5 w-5" /> Sign in with Discord
              </Button>
              <Button
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
                onClick={() => loginWithProvider("github")}
              >
                <IconBrandGithub className="h-5 w-5" /> Sign in with GitHub
              </Button>
              <Separator />
              <Button
                className="w-full flex items-center justify-center gap-2"
                variant="secondary"
                onClick={() => setShowGuestForm(true)}
              >
                <IconUser className="h-5 w-5" /> Continue as Guest
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}