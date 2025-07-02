import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/AuthContext";
import { Menu, X, Eye, Plus, Pin, PinOff, Trash2 } from "lucide-react";

interface CanvasSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  createdAt: number;
  createdBy?: string;
  pinned?: boolean;
}

export default function ExplorePage() {
  const { user, setShowAuthModal, isAdmin } = useAuth();
  const [canvases, setCanvases] = useState<CanvasSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  // Pin/unpin handler
  const handlePin = async (id: string, pinned: boolean) => {
    await fetch("/api/canvas/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pinned }),
    });
    setCanvases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned } : c))
    );
  };

  // Delete handler
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this canvas? This cannot be undone.")) return;
    await fetch("/api/canvas/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCanvases((prev) => prev.filter((c) => c.id !== id));
  };

  // Sort: pinned first
  const sortedCanvases = [
    ...canvases.filter((c) => c.pinned),
    ...canvases.filter((c) => !c.pinned),
  ];

  useEffect(() => {
    fetch("/api/canvas/explore")
      .then((res) => res.json())
      .then((data) => {
        setCanvases(data.canvases || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <Head>
        <title>Explore Canvases - OpenPlace</title>
        <meta
          name="description"
          content="Explore public collaborative pixel art canvases"
        />
        <link rel="icon" type="image/png" href="/api/logo.png" />
      </Head>
      <div className="flex min-h-screen flex-col bg-background">
        {/* Navbar */}
        <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-blue-600"
            >
              OpenPlace
            </Link>
            {/* Desktop nav */}
            <nav className="hidden gap-2 sm:flex items-center">
              <Button variant="ghost" asChild>
                <Link href="/explore">Explore</Link>
              </Button>
              <Button onClick={() => setShowAuthModal(true)}>
                {user ? "Account" : "Sign In / Register"}
              </Button>
              <ThemeToggle />
            </nav>
            {/* Mobile nav toggle */}
            <button
              className="sm:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setNavOpen((v) => !v)}
              aria-label="Open navigation"
            >
              {navOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          {/* Mobile nav menu */}
          {navOpen && (
            <nav className="sm:hidden flex flex-col gap-1 px-4 pb-4 bg-background border-b">
              <Button
                variant="ghost"
                asChild
                className="justify-start"
                onClick={() => setNavOpen(false)}
              >
                <Link href="/explore">Explore</Link>
              </Button>
              <Button
                className="justify-start"
                onClick={() => {
                  setShowAuthModal(true);
                  setNavOpen(false);
                }}
              >
                {user ? "Account" : "Sign In / Register"}
              </Button>
              <div className="flex justify-start">
                <ThemeToggle />
              </div>
            </nav>
          )}
        </header>

        {/* Main Content */}
        <section className="flex-1 w-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-blue-950 py-10 px-2">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
                  Explore Public Canvases
                </h1>
                <p className="text-base text-gray-700 dark:text-gray-300">
                  Browse and join live collaborative pixel art canvases.
                </p>
              </div>
              <Button asChild size="lg" className="px-6 py-3 text-base">
                <Link href="/create-canvas">
                  <Plus className="mr-2 h-5 w-5" />
                  Start Your Canvas
                </Link>
              </Button>
            </div>
            {loading ? (
              <div className="text-center text-gray-500 py-20">
                Loading canvases...
              </div>
            ) : sortedCanvases.length === 0 ? (
              <div className="text-center text-gray-500 py-20">
                No public canvases found.{" "}
                <Link href="/create-canvas" className="text-blue-600 underline">
                  Create one!
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {sortedCanvases.map((canvas) => (
                  <Card
                    key={canvas.id}
                    className="hover:shadow-xl transition-shadow bg-card"
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Eye className="h-5 w-5 text-blue-500" />
                        <span>{canvas.name}</span>
                        {canvas.pinned && (
                          <Pin className="h-4 w-4 text-yellow-500" title="Pinned" />
                        )}
                      </CardTitle>
                      <CardDescription>
                        {canvas.width} × {canvas.height} px
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className="inline-block h-6 w-6 rounded border"
                            style={{ backgroundColor: canvas.backgroundColor }}
                            title={`Background: ${canvas.backgroundColor}`}
                          />
                          <span className="text-xs text-gray-500">
                            Created{" "}
                            {new Date(canvas.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button asChild size="sm" variant="default">
                            <Link href={`/canvas/${canvas.id}`}>Open</Link>
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handlePin(canvas.id, !canvas.pinned)}
                                title={canvas.pinned ? "Unpin" : "Pin"}
                              >
                                {canvas.pinned ? (
                                  <PinOff className="h-4 w-4 text-yellow-500" />
                                ) : (
                                  <Pin className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(canvas.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full border-t py-6 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-auto">
          <div className="container mx-auto">
            <p>&copy; {new Date().getFullYear()} OpenPlace. All rights reserved.</p>
            <div className="mt-2 space-x-2 sm:space-x-4">
              <Link href="/privacy" className="hover:underline">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:underline">
                Terms of Service
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}