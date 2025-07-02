import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Home,
  Palette,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Menu,
  X,
  Lock,
  Clock,
  Wifi,
  WifiOff,
  Users,
  User,
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";

interface PixelData {
  x: number;
  y: number;
  color: string;
  timestamp: number;
  user?: string;
}

interface ViewState {
  x: number;
  y: number;
  scale: number;
}

interface CanvasConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  placeCooldown: number;
  password?: string;
  backgroundColor: string;
  gridColor: string;
  showGrid: boolean;
  gridThreshold: number;
  maxZoom: number;
  minZoom: number;
  allowedColors?: string[];
  createdAt: number;
  createdBy?: string;
  showPixelAuthors: "admins" | "everyone";
}

const DEFAULT_COLORS = [
  "#FFFFFF",
  "#E4E4E4",
  "#888888",
  "#222222",
  "#FFA7D1",
  "#E50000",
  "#E59500",
  "#A06A42",
  "#E5D900",
  "#94E044",
  "#02BE01",
  "#00D3DD",
  "#0083C7",
  "#0000EA",
  "#CF6EE4",
  "#820080",
];

export default function Canvas() {
  const router = useRouter();
  const { id } = router.query;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- AUTH ---
  const { user, setShowAuthModal, isAdmin, loading: authLoading } = useAuth();

  // Canvas configuration
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Canvas state
  const [selectedColor, setSelectedColor] = useState("#E50000");
  const [pixels, setPixels] = useState<Map<string, PixelData>>(new Map());
  const [viewState, setViewState] = useState<ViewState>({
    x: 0,
    y: 0,
    scale: 1,
  });

  // Interaction state
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isPlacing, setIsPlacing] = useState(false);
  const [currentTool, setCurrentTool] = useState<"draw" | "pan">("draw");

  // Cooldown state
  const [lastPlaceTime, setLastPlaceTime] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Cursor tracking
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(
    null
  );

  // UI states
  const [showNavbar, setShowNavbar] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showZoomControls, setShowZoomControls] = useState(false);

  // WebSocket connection - this provides userCount
  const { isConnected, lastMessage, userCount } = useWebSocket(
    typeof id === "string" ? id : "",
    user?.name || user?.$id || "anonymous"
  );

  // --- Responsive helpers ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load canvas configuration and pixels
  useEffect(() => {
    if (typeof id === "string") {
      loadCanvas(id);
    }
    // eslint-disable-next-line
  }, [id]);

  const loadCanvas = async (canvasId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/canvas/${canvasId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Canvas not found");
        } else {
          setError("Failed to load canvas");
        }
        return;
      }

      const data = await response.json();
      const { canvas, pixels: pixelArray } = data;

      setCanvasConfig(canvas);

      // Convert pixel array to Map
      const pixelMap = new Map<string, PixelData>();
      pixelArray.forEach((pixel: PixelData) => {
        pixelMap.set(`${pixel.x},${pixel.y}`, pixel);
      });
      setPixels(pixelMap);

      // Initialize view state based on canvas size
      setViewState({
        x: -canvas.width / 2,
        y: -canvas.height / 2,
        scale:
          Math.min(
            window.innerWidth / canvas.width,
            window.innerHeight / canvas.height
          ) * 0.8,
      });

      // Check if password is required
      if (!canvas.password) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Error loading canvas:", error);
      setError("Failed to load canvas");
    } finally {
      setLoading(false);
    }
  };

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case "pixel_placed":
        const pixelData = lastMessage.data as PixelData;
        setPixels((prev) => new Map(prev.set(`${pixelData.x},${pixelData.y}`, pixelData)));
        break;
      case "connected":
        // console.log("Connected to canvas:", lastMessage.data);
        break;
      case "user_count_update":
        // userCount is already handled by the useWebSocket hook
        break;
    }
  }, [lastMessage]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  // Password authentication
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canvasConfig && passwordInput === canvasConfig.password) {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Incorrect password");
      setPasswordInput("");
    }
  };

  // Initialize canvas
  useEffect(() => {
    if (!canvasConfig || !isAuthenticated) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      // On mobile, use full viewport minus UI
      if (isMobile) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      drawCanvas();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
    // eslint-disable-next-line
  }, [canvasConfig, isAuthenticated, isMobile]);

  // Draw canvas function
  const drawCanvas = useCallback(() => {
    if (!canvasConfig) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#CCCCCC";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context for transformations
    ctx.save();

    // Apply view transformations
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(viewState.scale, viewState.scale);
    ctx.translate(viewState.x, viewState.y);

    // Draw canvas background
    ctx.fillStyle = canvasConfig.backgroundColor;
    ctx.fillRect(0, 0, canvasConfig.width, canvasConfig.height);

    // Draw grid if enabled and zoomed in enough
    if (canvasConfig.showGrid && viewState.scale > canvasConfig.gridThreshold) {
      ctx.strokeStyle = canvasConfig.gridColor;
      ctx.lineWidth = 0.2 / viewState.scale;

      for (let x = 0; x <= canvasConfig.width; x += 1) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasConfig.height);
        ctx.stroke();
      }

      for (let y = 0; y <= canvasConfig.height; y += 1) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasConfig.width, y);
        ctx.stroke();
      }
    }

    // Draw pixels
    pixels.forEach((pixel) => {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(pixel.x, pixel.y, 1, 1);
    });

    // Draw hover cursor/outline
    if (hoveredPixel && currentTool === "draw") {
      const { x, y } = hoveredPixel;

      // Draw preview of the pixel that would be placed
      if (cooldownRemaining === 0) {
        ctx.fillStyle = selectedColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, 1, 1);
        ctx.globalAlpha = 1.0;
      }

      // Draw outline around the pixel
      ctx.strokeStyle = cooldownRemaining > 0 ? "#FF0000" : "#000000";
      ctx.lineWidth = Math.max(0.1, 2 / viewState.scale);
      ctx.strokeRect(
        x - 0.5 / viewState.scale,
        y - 0.5 / viewState.scale,
        1 + 1 / viewState.scale,
        1 + 1 / viewState.scale
      );

      // Add a white outline for better visibility
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = Math.max(0.05, 1 / viewState.scale);
      ctx.strokeRect(
        x - 1 / viewState.scale,
        y - 1 / viewState.scale,
        1 + 2 / viewState.scale,
        1 + 2 / viewState.scale
      );
    }

    // Restore context
    ctx.restore();
  }, [
    viewState,
    pixels,
    hoveredPixel,
    selectedColor,
    currentTool,
    canvasConfig,
    cooldownRemaining,
  ]);

  // Redraw when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      if (!canvasConfig) return null;

      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();

      const mouseX = screenX - rect.left - canvas.width / 2;
      const mouseY = screenY - rect.top - canvas.height / 2;

      const canvasX = Math.floor(mouseX / viewState.scale - viewState.x);
      const canvasY = Math.floor(mouseY / viewState.scale - viewState.y);

      if (
        canvasX >= 0 &&
        canvasX < canvasConfig.width &&
        canvasY >= 0 &&
        canvasY < canvasConfig.height
      ) {
        return { x: canvasX, y: canvasY };
      }
      return null;
    },
    [viewState, canvasConfig]
  );

  // --- Cooldown is enforced strictly here ---
  const placePixel = useCallback(
    async (x: number, y: number) => {
      if (!canvasConfig || cooldownRemaining > 0 || !id) return;

      setCooldownRemaining(canvasConfig.placeCooldown);

      try {
        const response = await fetch(`/api/canvas/${id}/place`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            x,
            y,
            color: selectedColor,
            userId: user?.$id,
            username: user?.name,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Failed to place pixel:", error.error);
          return;
        }

        setLastPlaceTime(Date.now());

        // --- Optimistically update pixel immediately ---
        setPixels((prev) => {
          const newMap = new Map(prev);
          newMap.set(`${x},${y}`, {
            x,
            y,
            color: selectedColor,
            timestamp: Date.now(),
            user: user?.name || user?.$id || "anonymous",
          });
          return newMap;
        });
      } catch (error) {
        console.error("Error placing pixel:", error);
      }
    },
    [selectedColor, canvasConfig, cooldownRemaining, id, user]
  );

  // Mouse event handlers
  const handleMouseDown = (event: React.MouseEvent) => {
    if (!canvasConfig) return;
    event.preventDefault();

    if (event.button === 2) {
      setCurrentTool("pan");
      setIsPanning(true);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
    } else if (event.button === 0) {
      if (event.ctrlKey || event.metaKey) {
        setCurrentTool("pan");
        setIsPanning(true);
        setLastPanPoint({ x: event.clientX, y: event.clientY });
      } else {
        setCurrentTool("draw");
        const coords = screenToCanvas(event.clientX, event.clientY);
        if (coords && cooldownRemaining === 0) {
          setIsPlacing(true);
          placePixel(coords.x, coords.y);
        }
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    const coords = screenToCanvas(event.clientX, event.clientY);
    setHoveredPixel(coords);

    if (isPanning && currentTool === "pan") {
      const deltaX = event.clientX - lastPanPoint.x;
      const deltaY = event.clientY - lastPanPoint.y;

      setViewState((prev) => ({
        ...prev,
        x: prev.x + deltaX / prev.scale,
        y: prev.y + deltaY / prev.scale,
      }));

      setLastPanPoint({ x: event.clientX, y: event.clientY });
    }
    // No pixel placement here!
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsPlacing(false);
    setCurrentTool("draw");
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
    setIsPlacing(false);
    setCurrentTool("draw");
    setHoveredPixel(null);
  };

  // --- Touch event handlers for mobile ---
  // Touch state for tap detection
  const [touchState, setTouchState] = useState<{
    lastTouches: TouchList | null;
    lastPan: { x: number; y: number } | null;
    lastScale: number | null;
    mode: "none" | "pan" | "draw" | "zoom";
    startX: number;
    startY: number;
    moved: boolean;
  }>({
    lastTouches: null,
    lastPan: null,
    lastScale: null,
    mode: "none",
    startX: 0,
    startY: 0,
    moved: false,
  });

  const TAP_MOVE_THRESHOLD = 10; // px

  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canvasConfig) return;
    if (e.touches.length === 1) {
      setTouchState({
        lastTouches: e.touches,
        lastPan: { x: e.touches[0].clientX, y: e.touches[0].clientY },
        lastScale: null,
        mode: "draw",
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        moved: false,
      });
      setHoveredPixel(
        screenToCanvas(e.touches[0].clientX, e.touches[0].clientY)
      );
    } else if (e.touches.length === 2) {
      setTouchState({
        lastTouches: e.touches,
        lastPan: null,
        lastScale: getTouchDistance(e.touches),
        mode: "zoom",
        startX: 0,
        startY: 0,
        moved: false,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canvasConfig) return;
    if (touchState.mode === "draw" && e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchState.startX;
      const dy = e.touches[0].clientY - touchState.startY;
      const moved =
        touchState.moved ||
        Math.abs(dx) > TAP_MOVE_THRESHOLD ||
        Math.abs(dy) > TAP_MOVE_THRESHOLD;
      setTouchState((prev) => ({
        ...prev,
        moved,
      }));
      setHoveredPixel(
        screenToCanvas(e.touches[0].clientX, e.touches[0].clientY)
      );
    } else if (touchState.mode === "zoom" && e.touches.length === 2) {
      // Pinch to zoom
      const newDist = getTouchDistance(e.touches);
      if (touchState.lastScale && newDist) {
        const scaleDelta = newDist / touchState.lastScale;
        const newScale = Math.max(
          canvasConfig.minZoom,
          Math.min(canvasConfig.maxZoom, viewState.scale * scaleDelta)
        );
        setViewState((prev) => ({
          ...prev,
          scale: newScale,
        }));
      }
      setTouchState((prev) => ({
        ...prev,
        lastScale: newDist,
      }));
      // Pan with two fingers
      if (e.touches.length === 2 && touchState.lastTouches) {
        const prevMid = {
          x:
            (touchState.lastTouches[0].clientX +
              touchState.lastTouches[1].clientX) /
            2,
          y:
            (touchState.lastTouches[0].clientY +
              touchState.lastTouches[1].clientY) /
            2,
        };
        const currMid = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        const deltaX = currMid.x - prevMid.x;
        const deltaY = currMid.y - prevMid.y;
        setViewState((prev) => ({
          ...prev,
          x: prev.x + deltaX / prev.scale,
          y: prev.y + deltaY / prev.scale,
        }));
        setTouchState((prev) => ({
          ...prev,
          lastTouches: e.touches,
        }));
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Only place pixel if it was a tap (not a drag/pan/scroll)
    if (
      canvasConfig &&
      touchState.mode === "draw" &&
      !touchState.moved &&
      cooldownRemaining === 0
    ) {
      // Use the last known position
      const coords = hoveredPixel;
      if (coords) {
        placePixel(coords.x, coords.y);
      }
    }
    setTouchState({
      lastTouches: null,
      lastPan: null,
      lastScale: null,
      mode: "none",
      startX: 0,
      startY: 0,
      moved: false,
    });
    setHoveredPixel(null);
  };

  // Fix the wheel handler
  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!canvasConfig) return;

      event.preventDefault();
      event.stopPropagation();

      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(
        canvasConfig.minZoom,
        Math.min(canvasConfig.maxZoom, viewState.scale * delta)
      );

      if (newScale !== viewState.scale) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const mouseX = event.clientX - rect.left - canvas.width / 2;
          const mouseY = event.clientY - rect.top - canvas.height / 2;

          const scaleFactor = newScale / viewState.scale;

          setViewState((prev) => ({
            x: prev.x - (mouseX / prev.scale) * (scaleFactor - 1),
            y: prev.y - (mouseY / prev.scale) * (scaleFactor - 1),
            scale: newScale,
          }));
        }
      }
    },
    [canvasConfig, viewState.scale]
  );

  // Add wheel event listener properly
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  const resetView = () => {
    if (!canvasConfig) return;
    setViewState({
      x: -canvasConfig.width / 2,
      y: -canvasConfig.height / 2,
      scale:
        Math.min(
          window.innerWidth / canvasConfig.width,
          window.innerHeight / canvasConfig.height
        ) * 0.8,
    });
  };

  const handleExportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas to export only the pixel area (not the whole viewport)
    if (!canvasConfig) return;

    // Create an offscreen canvas of the actual pixel size
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvasConfig.width;
    exportCanvas.height = canvasConfig.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return;

    // Fill background
    exportCtx.fillStyle = canvasConfig.backgroundColor;
    exportCtx.fillRect(0, 0, canvasConfig.width, canvasConfig.height);

    // Draw all pixels
    pixels.forEach((pixel) => {
      exportCtx.fillStyle = pixel.color;
      exportCtx.fillRect(pixel.x, pixel.y, 1, 1);
    });

    // Download as PNG
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${canvasConfig.name || "canvas"}.png`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }, "image/png");
  };

  const zoomIn = () => {
    if (!canvasConfig) return;
    setViewState((prev) => ({
      ...prev,
      scale: Math.min(canvasConfig.maxZoom, prev.scale * 1.5),
    }));
  };

  const zoomOut = () => {
    if (!canvasConfig) return;
    setViewState((prev) => ({
      ...prev,
      scale: Math.max(canvasConfig.minZoom, prev.scale / 1.5),
    }));
  };

  // Prevent context menu
  useEffect(() => {
    const handleContextMenu = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // Prevent scrolling on mobile when touching canvas
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      if (e.target === canvasRef.current) e.preventDefault();
    };
    document.body.addEventListener("touchmove", preventScroll, { passive: false });
    return () =>
      document.body.removeEventListener("touchmove", preventScroll);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowNavbar(false);
        setShowColorPicker(false);
        setShowZoomControls(false);
      }
      if (e.key === "m" || e.key === "M") {
        setShowNavbar((v) => !v);
      }
      if (e.key === "c" || e.key === "C") {
        setShowColorPicker((v) => !v);
      }
      if (e.key === "z" || e.key === "Z") {
        setShowZoomControls((v) => !v);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getCursorStyle = () => {
    if (isMobile) return "pointer";
    if (isPanning || currentTool === "pan") return "grabbing";
    return "crosshair";
  };

  // Get available colors (either restricted or default)
  const availableColors = canvasConfig?.allowedColors || DEFAULT_COLORS;

  // --- UI Offsets ---
  // Navbar height: 72px, Color picker height: 96px
  const navbarOffset = showNavbar ? 72 : 0;

  // --- Pixel author display logic ---
  function canSeePixelAuthors() {
    if (!canvasConfig) return false;
    if (canvasConfig.showPixelAuthors === "everyone") return true;
    if (canvasConfig.showPixelAuthors === "admins" && isAdmin) return true;
    return false;
  }

  // --- UI rendering ---

  // Loading state
  if (loading) {
    return (
      <>
        <Head>
          <title>Loading... - OpenPlace</title>
        </Head>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Loading canvas...</h1>
            <p className="text-gray-600">Canvas ID: {id}</p>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Head>
          <title>Error - OpenPlace</title>
        </Head>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Error</h1>
            <p className="text-gray-600">{error}</p>
            <Button asChild className="mt-4">
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Password prompt
  if (canvasConfig?.password && !isAuthenticated) {
    return (
      <>
        <Head>
          <title>{canvasConfig.name} - OpenPlace</title>
          <meta name="description" content="Password protected canvas" />
        </Head>
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl">{canvasConfig.name}</CardTitle>
              <CardDescription>
                This canvas is password protected. Enter the password to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter canvas password"
                    className={authError ? "border-red-500" : ""}
                  />
                  {authError && (
                    <p className="mt-1 text-sm text-red-600">{authError}</p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  Access Canvas
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/">Back to Home</Link>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // --- Always render all hooks above this line! ---
  // --- Block with AuthModal if not logged in ---
  // (authLoading is from useAuth, not the canvas loading)
  // This will block the UI until the user is authenticated (including guest)
  // The modal cannot be closed until signed in
  // The rest of the UI is still rendered, so hooks order is preserved
  return (
    <>
      <Head>
        <title>{canvasConfig?.name} - OpenPlace</title>
        <meta
          name="description"
          content={`Collaborative pixel art canvas: ${canvasConfig?.name}`}
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, user-scalable=no"
        />
        <link rel="icon" type="image/png" href="/api/logo.png" />
      </Head>

      {/* Block with AuthModal if not logged in */}
      {!authLoading && !user && <AuthModal forceOpen />}

      <div
        ref={containerRef}
        className="fixed inset-0 overflow-hidden bg-gray-300"
        style={{ cursor: getCursorStyle(), touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-full touch-none"
          onMouseDown={isMobile ? undefined : handleMouseDown}
          onMouseMove={isMobile ? undefined : handleMouseMove}
          onMouseUp={isMobile ? undefined : handleMouseUp}
          onMouseLeave={isMobile ? undefined : handleMouseLeave}
          onTouchStart={isMobile ? handleTouchStart : undefined}
          onTouchMove={isMobile ? handleTouchMove : undefined}
          onTouchEnd={isMobile ? handleTouchEnd : undefined}
        />

        {/* Menu Toggle Button */}
        <Button
          variant="outline"
          size={isMobile ? "icon" : "sm"}
          className={`fixed top-2 left-2 z-50 bg-white/90 backdrop-blur-sm border-2 border-gray-300 shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 dark:bg-gray-900/90 dark:border-gray-600 dark:hover:bg-gray-900
            ${isMobile ? "w-12 h-12 p-0" : ""}`}
          onClick={() => setShowNavbar(!showNavbar)}
        >
          {showNavbar ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        {/* Navbar */}
        <div
          className={`fixed top-0 left-0 right-0 z-40 transform transition-transform duration-300 ${
            showNavbar ? "translate-y-0" : "-translate-y-full"
          }`}
          style={{ height: isMobile ? 56 : 72 }}
        >
          <div className="border-b bg-background/95 py-2 sm:py-4 backdrop-blur-sm shadow-lg">
            <div className="container mx-auto flex items-center justify-between px-2 sm:px-4">
              <div>
                <Link
                  href="/"
                  className="text-xl sm:text-2xl font-bold tracking-tight text-blue-600"
                >
                  OpenPlace
                </Link>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {canvasConfig?.name} ({canvasConfig?.width}×{canvasConfig?.height})
                </div>
              </div>
              <nav className="flex items-center space-x-2 sm:space-x-4">
                <Button variant="ghost" size="icon" asChild className="sm:hidden">
                  <Link href="/">
                    <Home className="h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Home
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/explore">Explore</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/create-canvas">Create Canvas</Link>
                </Button>
                <ThemeToggle />
                {/* --- AUTH BUTTON --- */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAuthModal(true)}
                  className="ml-2"
                >
                  {user ? (
                    <>
                      <User className="h-4 w-4 mr-1" />
                      Account
                    </>
                  ) : (
                    "Sign In / Register"
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2"
                  onClick={handleExportCanvas}
                >
                  Export PNG
                </Button>
              </nav>
            </div>
          </div>
        </div>

        {/* Color Picker */}
        <div
          className={`fixed bottom-2 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
            showColorPicker ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          }`}
          style={{ height: isMobile ? 72 : 96, width: isMobile ? "98vw" : "auto" }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-full px-2 sm:px-6 py-2 sm:py-4 shadow-2xl border-2 border-gray-200 dark:bg-gray-900/95 dark:border-gray-700">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-1 sm:space-x-2">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 transition-all hover:scale-110 ${
                      selectedColor === color
                        ? "border-blue-500 ring-2 ring-blue-200 scale-110"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                    title={color}
                  />
                ))}
              </div>

              {!canvasConfig?.allowedColors && (
                <>
                  <div className="h-7 w-px bg-gray-300 dark:bg-gray-600" />
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="h-7 w-7 sm:h-8 sm:w-8 cursor-pointer rounded-full border-2 border-gray-300 bg-transparent"
                    />
                    <span className="text-xs font-mono text-gray-600 dark:text-gray-400 min-w-[4rem]">
                      {selectedColor.toUpperCase()}
                    </span>
                  </div>
                </>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowColorPicker(false)}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Color Picker Toggle Button */}
        <Button
          variant="outline"
          size={isMobile ? "icon" : "sm"}
          className={`fixed bottom-2 left-2 z-50 bg-white/90 backdrop-blur-sm border-2 border-gray-300 shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 dark:bg-gray-900/90 dark:border-gray-600 dark:hover:bg-gray-900 ${
            showColorPicker ? "opacity-50" : ""
          } ${isMobile ? "w-12 h-12 p-0" : ""}`}
          onClick={() => setShowColorPicker(!showColorPicker)}
        >
          <div
            className="h-4 w-4 rounded-full border border-gray-400 mr-0 sm:mr-2"
            style={{ backgroundColor: selectedColor }}
          />
          <Palette className="h-4 w-4 hidden sm:inline" />
        </Button>

        {/* Zoom Controls Toggle Button */}
        <Button
          variant="outline"
          size={isMobile ? "icon" : "sm"}
          className="fixed bottom-2 right-2 z-50 bg-white/90 backdrop-blur-sm border-2 border-gray-300 shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 dark:bg-gray-900/90 dark:border-gray-600 dark:hover:bg-gray-900"
          onClick={() => setShowZoomControls(!showZoomControls)}
        >
          {showZoomControls ? <X className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
        </Button>

        {/* Zoom Controls */}
        <div
          className={`fixed bottom-20 right-2 z-40 transform transition-all duration-200 ${
            showZoomControls
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <div className="flex flex-col space-y-2">
            <Button
              variant="outline"
              size={isMobile ? "icon" : "sm"}
              onClick={zoomIn}
              className="bg-white/90 backdrop-blur-sm border-2 border-gray-300 shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 dark:bg-gray-900/90 dark:border-gray-600 dark:hover:bg-gray-900"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size={isMobile ? "icon" : "sm"}
              onClick={zoomOut}
              className="bg-white/90 backdrop-blur-sm border-2 border-gray-300 shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 dark:bg-gray-900/90 dark:border-gray-600 dark:hover:bg-gray-900"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size={isMobile ? "icon" : "sm"}
              onClick={resetView}
              className="bg-white/90 backdrop-blur-sm border-2 border-gray-300 shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 dark:bg-gray-900/90 dark:border-gray-600 dark:hover:bg-gray-900"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status indicators */}
        <div
          className="fixed right-2 z-40 flex flex-col space-y-2 transition-all duration-300"
          style={{
            top: 12 + navbarOffset,
            bottom: showColorPicker ? (isMobile ? 80 : 112) : undefined,
            maxWidth: isMobile ? 180 : 240,
          }}
        >
          <div className="rounded-lg bg-black/80 backdrop-blur-sm p-2 text-xs sm:text-sm text-white shadow-xl border border-gray-600 flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-400" />
            )}
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
          </div>

          {/* User count indicator */}
          <div className="rounded-lg bg-black/80 backdrop-blur-sm p-2 text-xs sm:text-sm text-white shadow-xl border border-gray-600 flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-400" />
            <span>
              {userCount} user{userCount !== 1 ? "s" : ""} online
            </span>
          </div>

          <div className="rounded-lg bg-black/80 backdrop-blur-sm p-2 text-xs sm:text-sm text-white shadow-xl border border-gray-600">
            Zoom: {Math.round(viewState.scale * 100)}%
          </div>
          <div className="rounded-lg bg-black/80 backdrop-blur-sm p-2 text-xs sm:text-sm text-white shadow-xl border border-gray-600 flex items-center space-x-2">
            <span>Color:</span>
            <div
              className="h-4 w-4 rounded border border-white/50"
              style={{ backgroundColor: selectedColor }}
            />
            <span>{selectedColor.toUpperCase()}</span>
          </div>
          {hoveredPixel && (
            <div className="rounded-lg bg-black/80 backdrop-blur-sm p-2 text-xs sm:text-sm text-white shadow-xl border border-gray-600">
              Pixel: ({hoveredPixel.x}, {hoveredPixel.y})
              {/* --- Pixel author display --- */}
              {canSeePixelAuthors() && (() => {
                const key = `${hoveredPixel.x},${hoveredPixel.y}`;
                const pixel = pixels.get(key);
                if (pixel && pixel.user) {
                  return (
                    <div className="mt-1 flex items-center gap-1">
                      <User className="h-3 w-3 inline-block mr-1" />
                      <span>
                        {pixel.user.length > 24
                          ? pixel.user.slice(0, 20) + "..."
                          : pixel.user}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
          {cooldownRemaining > 0 && (
            <div className="rounded-lg bg-red-600/90 backdrop-blur-sm p-2 text-xs sm:text-sm text-white shadow-xl border border-red-500 flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Cooldown: {cooldownRemaining}s</span>
            </div>
          )}
        </div>

        {/* Instructions overlay */}
        <div
          className="fixed left-2 z-40 rounded-lg bg-black/80 backdrop-blur-sm p-2 sm:p-3 text-xs sm:text-sm text-white shadow-xl border border-gray-600 transition-all duration-300"
          style={{
            top: (isMobile ? 60 : 80) + navbarOffset,
            maxWidth: isMobile ? 180 : 320,
          }}
        >
          <div>
            <strong>{canvasConfig?.name}</strong>
          </div>
          <div>
            Size: {canvasConfig?.width}×{canvasConfig?.height}
          </div>
          <div>Cooldown: {canvasConfig?.placeCooldown}s</div>
          {canvasConfig?.allowedColors && (
            <div>Colors: Restricted ({canvasConfig.allowedColors.length})</div>
          )}
          <div className="mt-2">
            <strong>Controls:</strong>
          </div>
          <div>Tap: Place pixel</div>
          <div>Pinch: Zoom</div>
          <div>Two-finger drag: Pan</div>
          <div>M/C/Z: Toggle panels</div>
        </div>
      </div>
    </>
  );
}