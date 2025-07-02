import { serve } from "bun";

// --- Parse dev mode flag ---
const isDev = Bun.argv.includes("--dev") || Bun.argv.includes("dev");

// --- Config ---
const port = Number(process.env.PORT) || 3001;
const hostname = process.env.HOSTNAME || "0.0.0.0";

// --- In-memory store for WebSocket connections ---
const canvasConnections = new Map<string, Set<any>>();

// --- Heartbeat system ---
const heartbeatInterval = 30000; // 30 seconds
const heartbeatTimeout = 10000; // 10 seconds

// --- WebSocket message handler ---
function handleWebSocketMessage(ws: any, message: any) {
  try {
    const data = JSON.parse(message);
    if (isDev) console.log("📨 WebSocket message:", data);

    switch (data.type) {
      case "join_canvas": {
        const { canvasId, userId } = data;
        ws.canvasId = canvasId;
        ws.userId = userId;
        ws.isAlive = true;
        ws.lastPong = Date.now();

        if (!canvasConnections.has(canvasId)) {
          canvasConnections.set(canvasId, new Set());
        }
        canvasConnections.get(canvasId)!.add(ws);

        const clientCount = canvasConnections.get(canvasId)!.size;
        if (isDev)
          console.log(
            `🔗 Client joined canvas ${canvasId} (${clientCount} total)`
          );

        // Send welcome message
        ws.send(
          JSON.stringify({
            type: "connected",
            data: { canvasId, userId, connectedUsers: clientCount },
          })
        );

        // Broadcast user count update
        broadcastToCanvas(canvasId, {
          type: "user_count_update",
          data: { count: clientCount },
        });
        break;
      }

      case "ping":
        ws.isAlive = true;
        ws.lastPong = Date.now();
        ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        break;

      case "pong":
        ws.isAlive = true;
        ws.lastPong = Date.now();
        break;

      case "pixel_placed":
        // Handle pixel placement if needed
        break;

      default:
        if (isDev) console.log("Unknown message type:", data.type);
    }
  } catch (error) {
    console.error("❌ Error handling WebSocket message:", error);
    // Don't close connection on parse errors, just log them
  }
}

// --- Broadcast to all clients in a canvas ---
function broadcastToCanvas(canvasId: string, message: any, excludeWs?: any) {
  const connections = canvasConnections.get(canvasId);
  if (!connections) return;

  const messageStr = JSON.stringify(message);
  let successCount = 0;
  const deadConnections: any[] = [];

  connections.forEach((ws) => {
    if (ws !== excludeWs) {
      if (ws.readyState === 1) {
        // 1 = OPEN
        try {
          ws.send(messageStr);
          successCount++;
        } catch (error) {
          console.error("❌ Error broadcasting to client:", error);
          deadConnections.push(ws);
        }
      } else {
        // Connection is not open, mark for removal
        deadConnections.push(ws);
      }
    }
  });

  // Clean up dead connections
  deadConnections.forEach((ws) => {
    connections.delete(ws);
    if (isDev) console.log("🧹 Cleaned up dead connection");
  });

  if (isDev && successCount > 0)
    console.log(
      `📡 Broadcasted ${message.type} to ${successCount} clients in canvas ${canvasId}`
    );
}

// --- Remove client from canvas on disconnect ---
function removeClient(ws: any) {
  if (ws.canvasId && canvasConnections.has(ws.canvasId)) {
    const connections = canvasConnections.get(ws.canvasId)!;
    connections.delete(ws);
    const remainingClients = connections.size;

    if (remainingClients === 0) {
      canvasConnections.delete(ws.canvasId);
      if (isDev) console.log(`🗑️ Removed empty canvas ${ws.canvasId}`);
    } else {
      broadcastToCanvas(ws.canvasId, {
        type: "user_count_update",
        data: { count: remainingClients },
      });
    }

    if (isDev)
      console.log(
        `🔌 Client disconnected from canvas ${ws.canvasId} (${remainingClients} remaining)`
      );
  }
}

// --- Heartbeat system to detect dead connections ---
function startHeartbeat() {
  setInterval(() => {
    const now = Date.now();
    let totalConnections = 0;
    let deadConnections = 0;

    canvasConnections.forEach((connections, canvasId) => {
      const deadWs: any[] = [];

      connections.forEach((ws) => {
        totalConnections++;

        if (ws.readyState !== 1) {
          // Connection is not open
          deadWs.push(ws);
          return;
        }

        // Check if client responded to last ping
        if (ws.lastPong && now - ws.lastPong > heartbeatInterval + heartbeatTimeout) {
          if (isDev) console.log("💀 Client failed heartbeat check");
          deadWs.push(ws);
          return;
        }

        // Send ping
        try {
          ws.send(JSON.stringify({ type: "ping", timestamp: now }));
          ws.isAlive = false; // Will be set to true when pong is received
        } catch (error) {
          console.error("❌ Error sending ping:", error);
          deadWs.push(ws);
        }
      });

      // Remove dead connections
      deadWs.forEach((ws) => {
        connections.delete(ws);
        deadConnections++;
        try {
          ws.close();
        } catch (e) {
          // Ignore errors when closing dead connections
        }
      });

      // Clean up empty canvas
      if (connections.size === 0) {
        canvasConnections.delete(canvasId);
      } else if (deadWs.length > 0) {
        // Broadcast updated user count
        broadcastToCanvas(canvasId, {
          type: "user_count_update",
          data: { count: connections.size },
        });
      }
    });

    if (isDev && (totalConnections > 0 || deadConnections > 0)) {
      console.log(
        `💓 Heartbeat: ${totalConnections} total, ${deadConnections} cleaned up`
      );
    }
  }, heartbeatInterval);
}

// --- Export for API routes (e.g. pixel placement) ---
export { broadcastToCanvas };

// --- Start the WebSocket server ---
serve({
  port,
  hostname,
  async fetch(req, server) {
    const url = new URL(req.url);

    // Handle WebSocket upgrade
    if (url.pathname === "/ws") {
      const canvasId = url.searchParams.get("canvasId");
      const userId = url.searchParams.get("userId") || "anonymous";

      if (!canvasId) {
        return new Response("Missing canvasId parameter", { status: 400 });
      }

      const upgraded = server.upgrade(req, {
        data: { canvasId, userId },
      });

      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined; // Upgrade successful
    }

    // Handle pixel broadcast
    if (url.pathname === "/broadcast-pixel" && req.method === "POST") {
      try {
        const body = await req.json();
        const { canvasId, pixel } = body;
        if (canvasId && pixel) {
          broadcastToCanvas(canvasId, {
            type: "pixel_placed",
            data: pixel,
          });
          return new Response("OK");
        }
        return new Response("Bad Request", { status: 400 });
      } catch (error) {
        console.error("❌ Error handling broadcast request:", error);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      const totalConnections = Array.from(canvasConnections.values()).reduce(
        (sum, connections) => sum + connections.size,
        0
      );
      return new Response(
        JSON.stringify({
          status: "ok",
          connections: totalConnections,
          canvases: canvasConnections.size,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // All other requests: 404
    return new Response("Not found", { status: 404 });
  },

  websocket: {
    open(ws: any) {
      ws.isAlive = true;
      ws.lastPong = Date.now();
    
      if (isDev) console.log("🔗 WebSocket connection opened");
    
      // Auto-join if canvasId is present
      if ((ws.data as { canvasId?: string })?.canvasId) {
        handleWebSocketMessage(
          ws,
          JSON.stringify({
            type: "join_canvas",
            canvasId: ws.data.canvasId,
            userId: ws.data.userId,
          })
        );
      }
    },

    message(ws, message) {
      try {
        handleWebSocketMessage(ws, message);
      } catch (error) {
        console.error("❌ Error in message handler:", error);
      }
    },

    close(ws, code, reason) {
      if (isDev) console.log(`🔌 WebSocket connection closed: ${code} ${reason}`);
      removeClient(ws);
    },
  },
});

// Start heartbeat system
startHeartbeat();

console.log(
  `🚀 WebSocket server running on ws://${hostname}:${port}/ws (${
    isDev ? "dev" : "prod"
  } mode)`
);