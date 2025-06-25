// server.ts (fixed version)
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import chokidar from 'chokidar';

const dev = process.argv.includes('--dev') || process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000');

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface ExtendedWebSocket extends WebSocket {
  canvasId?: string;
  userId?: string;
  isAlive?: boolean;
}

class CanvasWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, Set<ExtendedWebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: any) {
    // Create WebSocket server with simpler configuration
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Setup heartbeat to detect broken connections
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws: ExtendedWebSocket) => {
        if (ws.isAlive === false) {
          this.removeClient(ws);
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    console.log('✅ WebSocket server initialized');
  }

  private handleConnection(ws: ExtendedWebSocket, req: IncomingMessage) {
    const { query } = parse(req.url || '', true);
    const canvasId = query.canvasId as string;
    const userId = query.userId as string || 'anonymous';

    console.log('🔗 WebSocket connection attempt:', { canvasId, userId, url: req.url });

    if (!canvasId) {
      console.log('❌ No canvas ID provided, closing connection');
      ws.close(1008, 'Canvas ID required');
      return;
    }

    ws.canvasId = canvasId;
    ws.userId = userId;
    ws.isAlive = true;

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Add to canvas room
    if (!this.clients.has(canvasId)) {
      this.clients.set(canvasId, new Set());
    }
    this.clients.get(canvasId)!.add(ws);

    console.log(`🔗 Client connected to canvas ${canvasId} (${this.clients.get(canvasId)!.size} total)`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      data: { 
        canvasId, 
        userId,
        connectedUsers: this.clients.get(canvasId)!.size
      }
    }));

    // Broadcast user count update to all clients in the canvas
    this.broadcast(canvasId, {
      type: 'user_count_update',
      data: { count: this.clients.get(canvasId)!.size }
    }, ws);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('❌ Invalid message format:', error);
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed: ${code} ${reason}`);
      this.removeClient(ws);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.removeClient(ws);
    });
  }

  private removeClient(ws: ExtendedWebSocket) {
    if (ws.canvasId && this.clients.has(ws.canvasId)) {
      this.clients.get(ws.canvasId)!.delete(ws);
      const remainingClients = this.clients.get(ws.canvasId)!.size;
      
      if (remainingClients === 0) {
        this.clients.delete(ws.canvasId);
      } else {
        // Broadcast updated user count
        this.broadcast(ws.canvasId, {
          type: 'user_count_update',
          data: { count: remainingClients }
        });
      }
      
      console.log(`🔌 Client disconnected from canvas ${ws.canvasId} (${remainingClients} remaining)`);
    }
  }

  private handleMessage(ws: ExtendedWebSocket, message: any) {
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      case 'cursor_move':
        // Broadcast cursor position to other users in the same canvas
        if (ws.canvasId) {
          this.broadcast(ws.canvasId, {
            type: 'cursor_update',
            data: {
              userId: ws.userId,
              x: message.data.x,
              y: message.data.y
            }
          }, ws);
        }
        break;
      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }

  public broadcast(canvasId: string, message: any, excludeWs?: ExtendedWebSocket) {
    const canvasClients = this.clients.get(canvasId);
    if (!canvasClients) return;

    const messageStr = JSON.stringify(message);
    canvasClients.forEach(client => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('❌ Error sending message to client:', error);
          this.removeClient(client);
        }
      }
    });
  }

  public getClientCount(canvasId: string): number {
    return this.clients.get(canvasId)?.size || 0;
  }

  public getAllStats() {
    const stats = {
      totalCanvases: this.clients.size,
      totalUsers: 0,
      canvases: {} as Record<string, number>
    };

    this.clients.forEach((clients, canvasId) => {
      const count = clients.size;
      stats.canvases[canvasId] = count;
      stats.totalUsers += count;
    });

    return stats;
  }

  public close() {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
  }
}

let wsServer: CanvasWebSocketServer | null = null;

// Export function to get WebSocket server instance
export function getWebSocketServer(): CanvasWebSocketServer {
  if (!wsServer) {
    throw new Error('WebSocket server not initialized');
  }
  return wsServer;
}

async function startServer() {
  try {
    console.log('🚀 Starting OpenPlace server...');
    
    // Prepare Next.js
    await app.prepare();
    console.log('✅ Next.js prepared');

    // Create HTTP server
    const server = createServer(async (req, res) => {
      try {
        // Add CORS headers for development
        if (dev) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('❌ Error handling request:', err);
        res.statusCode = 500;
        res.end('Internal server error');
      }
    });

    // Initialize WebSocket server
    wsServer = new CanvasWebSocketServer(server);

    // Start the server
    server.listen(port, hostname, () => {
      console.log(`🌟 Server ready on http://${hostname}:${port}`);
      console.log(`🔌 WebSocket server ready on ws://${hostname}:${port}/ws`);
      
      if (dev) {
        console.log('🔧 Development mode enabled');
        setupDevWatcher();
      }
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('🛑 Shutting down gracefully...');
      wsServer?.close();
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

function setupDevWatcher() {
  // Watch for changes in server files and WebSocket-related files
  const watcher = chokidar.watch([
    'server.ts',
    'lib/websocket.ts',
    'lib/db.ts'
  ], {
    ignored: /node_modules/,
    persistent: true
  });

  let restartTimeout: NodeJS.Timeout;

  watcher.on('change', (filePath) => {
    console.log(`📝 File changed: ${filePath}`);
    
    // Debounce restarts
    clearTimeout(restartTimeout);
    restartTimeout = setTimeout(() => {
      console.log('🔄 Restarting server due to file changes...');
      
      // Close WebSocket server
      wsServer?.close();
      
      // Exit process - should be restarted by bun
      process.exit(0);
    }, 1000);
  });

  console.log('👀 Watching for file changes...');
}

// Start the server
if (require.main === module) {
  startServer();
}