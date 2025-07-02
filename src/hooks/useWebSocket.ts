import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
}

export function useWebSocket(canvasId: string, userId: string = "anonymous") {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [connectionState, setConnectionState] = useState<
    "disconnected" | "connecting" | "connected" | "reconnecting"
  >("disconnected");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const isManuallyClosedRef = useRef(false);
  const lastPingRef = useRef<number>(0);

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}/ws?canvasId=${encodeURIComponent(
      canvasId
    )}&userId=${encodeURIComponent(userId)}`;
  }, [canvasId, userId]);

  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const handleHeartbeat = useCallback(() => {
    // Clear existing timeout
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    // Set timeout to detect missed heartbeats
    heartbeatTimeoutRef.current = setTimeout(() => {
      console.log("💀 Heartbeat timeout - connection appears dead");
      if (wsRef.current) {
        wsRef.current.close();
      }
    }, 45000); // 45 seconds (server sends every 30s)
  }, []);

  const connect = useCallback(() => {
    if (!canvasId || isManuallyClosedRef.current) return;

    // Don't create multiple connections
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log("⏳ Connection already in progress");
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    clearTimeouts();
    setConnectionState("connecting");

    const wsUrl = getWebSocketUrl();
    console.log("🔗 Connecting to WebSocket:", wsUrl);

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("✅ WebSocket connected");
        setIsConnected(true);
        setConnectionState("connected");
        reconnectAttempts.current = 0;

        // Send join message
        if (wsRef.current) {
          wsRef.current.send(
            JSON.stringify({
              type: "join_canvas",
              canvasId,
              userId,
            })
          );
        }

        // Start heartbeat monitoring
        handleHeartbeat();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Handle different message types
          switch (message.type) {
            case "ping":
              // Respond to server ping
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                  JSON.stringify({
                    type: "pong",
                    timestamp: Date.now(),
                  })
                );
              }
              handleHeartbeat();
              break;

            case "pong":
              // Server responded to our ping
              handleHeartbeat();
              break;

            case "user_count_update":
              setUserCount(message.data.count);
              break;

            case "connected":
              setUserCount(message.data.connectedUsers || 1);
              break;

            default:
              // Handle other message types
              setLastMessage(message);
              break;
          }

          // Always update last message for debugging
          if (message.type !== "ping" && message.type !== "pong") {
            console.log("📨 WebSocket message:", message);
          }
        } catch (error) {
          console.error("❌ Failed to parse WebSocket message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log("🔌 WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        clearTimeouts();

        // Don't reconnect if manually closed or server shutdown
        if (isManuallyClosedRef.current || event.code === 1000) {
          setConnectionState("disconnected");
          return;
        }

        setConnectionState("reconnecting");

        // Attempt reconnection with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000
          );
          console.log(
            `🔄 Reconnecting in ${delay}ms (attempt ${
              reconnectAttempts.current + 1
            }/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          console.error("❌ Max reconnection attempts reached");
          setConnectionState("disconnected");
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
      };
    } catch (error) {
      console.error("❌ Failed to create WebSocket:", error);
      setConnectionState("disconnected");
    }
  }, [canvasId, userId, getWebSocketUrl, handleHeartbeat, clearTimeouts]);

  const disconnect = useCallback(() => {
    console.log("🔌 Manually disconnecting WebSocket");
    isManuallyClosedRef.current = true;
    clearTimeouts();

    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect");
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionState("disconnected");
    setUserCount(0);
    reconnectAttempts.current = 0;
  }, [clearTimeouts]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error("❌ Failed to send message:", error);
        return false;
      }
    } else {
      console.warn("⚠️ Cannot send message - WebSocket not connected");
      return false;
    }
  }, []);

  const forceReconnect = useCallback(() => {
    console.log("🔄 Force reconnecting...");
    reconnectAttempts.current = 0;
    isManuallyClosedRef.current = false;
    connect();
  }, [connect]);

  useEffect(() => {
    isManuallyClosedRef.current = false;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    isConnected,
    lastMessage,
    userCount,
    connectionState,
    sendMessage,
    connect: forceReconnect,
    disconnect,
  };
}