type Msg = Record<string, any> & { t: string };
type Handler = (msg: Msg) => void;

class Realtime {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private statusHandlers = new Set<(s: 'online' | 'offline' | 'connecting') => void>();
  private retry = 0;
  private closedByUser = false;
  private queue: string[] = [];

  connect() {
    this.closedByUser = false;
    this.retry = 0;
    this.open();
  }

  private open() {
    this.status('connecting');
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.status('online');
      for (const m of this.queue.splice(0)) ws.send(m);
    };
    ws.onmessage = (event) => {
      let msg: Msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      for (const h of this.handlers) h(msg);
    };
    ws.onclose = () => {
      this.status('offline');
      if (this.closedByUser) return;
      this.retry = Math.min(this.retry + 1, 8);
      setTimeout(() => this.open(), 500 * this.retry + Math.random() * 400);
    };
    ws.onerror = () => ws.close();
  }

  ready(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve) => {
      const off = this.onStatus((s) => { if (s === 'online') { off(); resolve(); } });
    });
  }

  on(fn: Handler) { this.handlers.add(fn); return () => { this.handlers.delete(fn); }; }
  onStatus(fn: (s: 'online' | 'offline' | 'connecting') => void) { this.statusHandlers.add(fn); return () => { this.statusHandlers.delete(fn); }; }

  private status(s: 'online' | 'offline' | 'connecting') { for (const h of this.statusHandlers) h(s); }

  send(obj: Record<string, unknown>) {
    const raw = JSON.stringify(obj);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(raw);
    else if (this.queue.length < 50) this.queue.push(raw);
  }

  close() {
    this.closedByUser = true;
    this.ws?.close();
    this.ws = null;
    this.queue = [];
  }
}

export const rt = new Realtime();
