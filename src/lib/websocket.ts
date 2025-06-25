// lib/websocket.ts (complete rewrite)
import { WebSocketServer, WebSocket } from 'ws';

interface ExtendedWebSocket extends WebSocket {
  canvasId?: string;
  userId?: string;
  isAlive?: boolean;
}

class CanvasWebSocketManager {
  private static instance: CanvasWebSocketManager;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<ExtendedWebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  static getInstance(): CanvasWebSocketManager {
    if (!CanvasWebSocketManager.instance) {
      CanvasWebSocketManager.instance = new CanvasWebSocketManager();
    }
    return CanvasWebSocketManager.instance;
  }

  initialize(server: any) {
    if (this.wss) return; // Already initialized

    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;
      
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

  private handleConnection(ws: ExtendedWebSocket, req: any) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const canvasId = url.searchParams.get('canvasId');
    const userId = url.searchParams.get('userId') || 'anonymous';

    console.log('🔗 WebSocket connection attempt:', { canvasId, userId });

    if (!canvasId) {
      console.log('❌ No canvas ID provided, closing connection');
      ws.close(1008, 'Canvas ID required');
      return;
    }

    ws.canvasId = canvasId;
    ws.userId = userId;
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    if (!this.clients.has(canvasId)) {
      this.clients.set(canvasId, new Set());
    }
    this.clients.get(canvasId)!.add(ws);

    console.log(`🔗 Client connected to canvas ${canvasId} (${this.clients.get(canvasId)!.size} total)`);

    ws.send(JSON.stringify({
      type: 'connected',
      data: { 
        canvasId, 
        userId,
        connectedUsers: this.clients.get(canvasId)!.size
      }
    }));

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
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}

export const wsManager = CanvasWebSocketManager.getInstance();
export function getWebSocketServer() {
  return wsManager;
}