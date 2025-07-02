import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import Head from "next/head";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Home() {
  const { user, setShowAuthModal } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <>
      <Head>
        <title>OpenPlace - The Collaborative Pixel Platform</title>
        <meta
          name="description"
          content="Host and join custom pixel art canvases. Your rules, your art, together."
        />
        <link rel="icon" type="image/png" href="/api/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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

        {/* Hero Section */}
        <section className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-blue-950 px-2 py-10 sm:py-20 text-center">
          <div className="w-full max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-gray-50">
              Your Pixels, Your Rules,{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Unlimited Canvases
              </span>
            </h1>
            <p className="mt-4 text-base sm:text-xl text-gray-700 dark:text-gray-300">
              OpenPlace empowers you to host collaborative pixel art experiences
              with full control over size, rules, and community.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Link href="/create-canvas" passHref>
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-6 py-3 text-base sm:text-lg"
                >
                  Start Your Canvas
                </Button>
              </Link>
              <Link href="/explore" passHref>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto px-6 py-3 text-base sm:text-lg"
                >
                  Explore Live Canvases
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Section */}
        <section className="w-full py-12 bg-background">
  <div className="max-w-4xl mx-auto px-4">
    <h2 className="text-center text-3xl sm:text-4xl font-extrabold mb-2">
      Unleash Your Creativity
    </h2>
    <p className="text-center text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-8">
      OpenPlace is designed for flexibility and control.
    </p>
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-6">
      <div className="flex-1">
        <div className="rounded-xl bg-card shadow-lg p-6 flex flex-col items-center text-center h-full">
          <h3 className="text-xl font-bold mb-2">Custom Canvas Sizes</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            From a tiny stamp to a massive mural, define your canvas dimensions precisely.
          </p>
        </div>
      </div>
      <div className="flex-1">
        <div className="rounded-xl bg-card shadow-lg p-6 flex flex-col items-center text-center h-full">
          <h3 className="text-xl font-bold mb-2">Granular Control</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Set custom rate limits, open/close times, and even moderation features.
          </p>
        </div>
      </div>
      <div className="flex-1">
        <div className="rounded-xl bg-card shadow-lg p-6 flex flex-col items-center text-center h-full">
          <h3 className="text-xl font-bold mb-2">See Every Pixel</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Track who placed which pixel with detailed history for transparency.
          </p>
        </div>
      </div>
    </div>
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