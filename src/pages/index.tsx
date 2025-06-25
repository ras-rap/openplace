// pages/index.tsx
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle"; // Import the ThemeToggle as a named export
import Head from "next/head";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head>
        <title>OpenPlace - The Collaborative Pixel Platform</title>
        <meta
          name="description"
          content="Host and join custom pixel art canvases. Your rules, your art, together."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex min-h-screen flex-col items-center justify-between">
        {/* Navbar */}
        <header className="container sticky top-0 z-40 mx-auto w-full border-b bg-background/80 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold tracking-tight text-blue-600">
              OpenPlace
            </Link>
            <nav className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link href="/canvases">Explore Canvases</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/about">About</Link>
              </Button>
              {/* This will be replaced with actual auth state later */}
              <Button asChild>
                <Link href="#auth">Sign In / Register</Link>
              </Button>
              <ThemeToggle /> {/* Add the ThemeToggle here */}
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative flex min-h-[calc(100vh-6rem)] w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 py-20 text-center dark:from-gray-950 dark:to-blue-950">
          <div className="relative z-10 mx-auto max-w-4xl px-4">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tighter text-gray-900 md:text-7xl dark:text-gray-50">
              Your Pixels, Your Rules,{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Unlimited Canvases
              </span>
            </h1>
            <p className="mt-6 text-xl text-gray-700 md:text-2xl dark:text-gray-300">
              OpenPlace empowers you to host collaborative pixel art experiences
              with full control over size, rules, and community.
            </p>
            <div className="mt-10 flex flex-col justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
              <Link href="/create-canvas" passHref>
                <Button size="lg" className="px-8 py-3 text-lg">
                  Start Your Canvas
                </Button>
              </Link>
              <Link href="/canvases" passHref>
                <Button size="lg" variant="outline" className="px-8 py-3 text-lg">
                  Explore Live Canvases
                </Button>
              </Link>
            </div>
          </div>
          {/* Subtle background animation/shapes could go here */}
        </section>

        {/* Feature Section 1 */}
        <section className="container mx-auto my-20 px-4 text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            Unleash Your Creativity
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            OpenPlace is designed for flexibility and control.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <Card className="flex flex-col items-center p-6 text-center shadow-lg transition-transform duration-300 hover:scale-[1.02]">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Custom Canvas Sizes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  From a tiny stamp to a massive mural, define your canvas dimensions precisely.
                </p>
              </CardContent>
            </Card>

            <Card className="flex flex-col items-center p-6 text-center shadow-lg transition-transform duration-300 hover:scale-[1.02]">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Granular Control</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Set custom rate limits, open/close times, and even moderation features.
                </p>
              </CardContent>
            </Card>

            <Card className="flex flex-col items-center p-6 text-center shadow-lg transition-transform duration-300 hover:scale-[1.02]">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">See Every Pixel</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Track who placed which pixel with detailed history for transparency.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Call to Action / Login Section */}
        <section
          id="auth"
          className="container mx-auto my-20 flex flex-col items-center justify-center px-4"
        >
          <Card className="w-full max-w-md p-6 shadow-xl dark:border-gray-800">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Get Started</CardTitle>
              <CardDescription>
                Log in or create an account to unlock your canvas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="login" className="py-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-login">Email</Label>
                      <Input id="email-login" type="email" placeholder="email@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-login">Password</Label>
                      <Input id="password-login" type="password" />
                    </div>
                    <Button className="w-full">Login</Button>
                    <div className="text-center text-sm text-gray-500">
                      <a href="#" className="underline hover:text-gray-700">
                        Forgot password?
                      </a>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="signup" className="py-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username-signup">Username</Label>
                      <Input id="username-signup" placeholder="your_username" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-signup">Email</Label>
                      <Input id="email-signup" type="email" placeholder="email@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-signup">Password</Label>
                      <Input id="password-signup" type="password" />
                    </div>
                    <Button className="w-full">Sign Up</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="w-full border-t py-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <div className="container mx-auto">
            <p>&copy; {new Date().getFullYear()} OpenPlace. All rights reserved.</p>
            <div className="mt-2 space-x-4">
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