const clients = new Set<(channel: string, data: unknown) => void>();

export function addMonitorClient(send: (channel: string, data: unknown) => void): () => void {
  clients.add(send);
  return () => clients.delete(send);
}

export function emitMonitorEvent(channel: string, data: unknown): void {
  for (const send of clients) {
    try {
      send(channel, data);
    } catch {
      /* client disconnected */
    }
  }
}
