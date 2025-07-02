// lib/websocket.ts (simplified for Bun)
let broadcastFunction: ((canvasId: string, message: any) => void) | null = null;
