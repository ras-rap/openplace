// pages/auth-callback.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const { refresh, setShowAuthModal } = useAuth();
  const router = useRouter();

  useEffect(() => {
    refresh().then(() => {
      setShowAuthModal(false);
      router.replace("/");
    });
    // eslint-disable-next-line
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Signing you in...</h1>
      </div>
    </div>
  );
}