// Stub for @/lib/websocket
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useWebSocket(_?: any): { isConnected: boolean; reconnect: () => void; connected: boolean } {
  return { isConnected: false, reconnect: () => {}, connected: false }
}