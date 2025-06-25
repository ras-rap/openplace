// hooks/useWebSocket.ts (updated)
import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket(canvasId: string, userId: string = 'anonymous') {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [userCount, setUserCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Use the same port as the main server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?canvasId=${canvasId}&userId=${userId}`;
    
    console.log('🔗 Connecting to WebSocket:', wsUrl);
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('🔗 WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle special message types
          if (message.type === 'user_count_update') {
            setUserCount(message.data.count);
          } else if (message.type === 'connected') {
            setUserCount(message.data.connectedUsers || 1);
          }
          
          setLastMessage(message);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);
        
        // Don't reconnect if it was a manual close
        if (event.code === 1000) return;
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          console.log('❌ Max reconnection attempts reached');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
    }
  }, [canvasId, userId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setUserCount(0);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not connected, message not sent:', message);
    }
  }, []);

  // Send cursor position updates
  const sendCursorUpdate = useCallback((x: number, y: number) => {
    sendMessage({
      type: 'cursor_move',
      data: { x, y }
    });
  }, [sendMessage]);

  useEffect(() => {
    if (canvasId) {
      connect();
    }
    return disconnect;
  }, [canvasId, userId, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    userCount,
    sendMessage,
    sendCursorUpdate,
    connect,
    disconnect,
  };
}
