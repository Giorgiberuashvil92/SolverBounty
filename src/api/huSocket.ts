import { io, type Socket } from 'socket.io-client';
import { API_HOST } from './config';
import { getAccessToken } from '../auth/session';

export type HuLegalAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call'; amount: number }
  | { type: 'bet'; min: number; max: number }
  | { type: 'raise'; min: number; max: number }
  | { type: 'all_in'; amount: number };

export type HuClientAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'bet'; amount: number }
  | { type: 'raise'; amount: number }
  | { type: 'all_in' };

export type HuPublicPlayer = {
  userId: string;
  displayName: string;
  stack: number;
  bet: number;
  folded: boolean;
  allIn: boolean;
  isButton: boolean;
  hole: [string, string] | null;
};

export type HuView = {
  tableId: string;
  status: 'active' | 'hand_over' | 'match_over';
  street: string;
  board: string[];
  pot: number;
  sb: number;
  bb: number;
  nextSb: number;
  nextBb: number;
  handsUntilLevel: number;
  handNumber: number;
  actorUserId: string | null;
  toCall: number;
  legalActions: HuLegalAction[];
  players: HuPublicPlayer[];
  heroUserId: string;
  winnerUserId: string | null;
  winnerName: string | null;
  showdown: boolean;
  lastAction: { userId: string; label: string } | null;
  actionDeadlineMs: number | null;
  actionMs?: number;
};

type Handlers = {
  onConnected?: (info: { userId: string; displayName: string }) => void;
  onQueued?: () => void;
  onMatchFound?: (info: { tableId: string; opponent: string }) => void;
  onTableState?: (view: HuView) => void;
  onOpponentDisconnected?: (info: { graceMs: number }) => void;
  onOpponentForfeit?: (info: { winnerId: string | null }) => void;
  onError?: (message: string) => void;
};

export class HuSocket {
  private socket: Socket | null = null;

  async connect(handlers: Handlers) {
    const token = await getAccessToken();
    if (!token) throw new Error('Not signed in');

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.socket = io(`${API_HOST}/hu`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connected', (info) => handlers.onConnected?.(info));
    this.socket.on('match_found', (info) => handlers.onMatchFound?.(info));
    this.socket.on('match_found', () => this.sync());
    this.socket.on('table_state', (view: HuView) => handlers.onTableState?.(view));
    this.socket.on('opponent_disconnected', (info) =>
      handlers.onOpponentDisconnected?.(info),
    );
    this.socket.on('opponent_forfeit', (info) =>
      handlers.onOpponentForfeit?.(info),
    );
    this.socket.on('error_msg', (info: { message?: string }) =>
      handlers.onError?.(info.message ?? 'Socket error'),
    );
    this.socket.on('connect_error', (err) =>
      handlers.onError?.(err.message || 'Connection failed'),
    );

    await new Promise<void>((resolve, reject) => {
      const s = this.socket!;
      const t = setTimeout(() => reject(new Error('HU connect timeout')), 8000);
      s.once('connected', () => {
        clearTimeout(t);
        resolve();
      });
      s.once('connect_error', (err) => {
        clearTimeout(t);
        reject(err);
      });
    });
  }

  async joinQueue() {
    const res = await this.emitAck<{
      ok: boolean;
      status?: string;
      error?: string;
    }>('queue:join', {});
    return res;
  }

  async leaveQueue() {
    return this.emitAck('queue:leave', {});
  }

  async sendAction(action: HuClientAction) {
    return this.emitAck<{ ok: boolean; error?: string }>('table:action', action);
  }

  sync() {
    this.socket?.emit('table:sync');
  }

  disconnect() {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  private emitAck<T>(event: string, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }
      this.socket.timeout(5000).emit(event, payload, (err: Error | null, res: T) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }
}
