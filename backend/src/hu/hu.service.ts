import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { ArenaService } from '../arena/arena.service';
import {
  ClientAction,
  HuEngine,
  type LegalAction,
  type HuView,
} from './hu.engine';
import { HuMatch } from './hu.schema';
import {
  HuMatchmaker,
  isBotUserId,
  type QueuePlayer,
} from './hu.matchmaker';

export type TableRoom = {
  engine: HuEngine;
  socketByUser: Map<string, string>;
  botUserId: string | null;
  actionTimer: ReturnType<typeof setTimeout> | null;
  botTimer: ReturnType<typeof setTimeout> | null;
  handPauseTimer: ReturnType<typeof setTimeout> | null;
  disconnectTimers: Map<string, ReturnType<typeof setTimeout>>;
};

type EmitFn = (socketId: string, event: string, payload: unknown) => void;

@Injectable()
export class HuService {
  private readonly log = new Logger(HuService.name);
  private tables = new Map<string, TableRoom>();
  private userTable = new Map<string, string>();
  private emit: EmitFn = () => undefined;

  constructor(
    private readonly matchmaker: HuMatchmaker,
    @InjectModel(HuMatch.name) private readonly matches: Model<HuMatch>,
    private readonly arena: ArenaService,
  ) {}

  setEmitter(fn: EmitFn) {
    this.emit = fn;
  }

  queueJoin(player: QueuePlayer) {
    if (this.userTable.has(player.userId)) {
      const tableId = this.userTable.get(player.userId)!;
      const room = this.tables.get(tableId);
      if (room) {
        room.socketByUser.set(player.userId, player.socketId);
        this.clearDisconnect(tableId, player.userId);
        this.pushState(tableId);
        this.maybeScheduleBot(tableId);
        return { status: 'rejoined' as const, tableId };
      }
    }

    const result = this.matchmaker.enqueue(player);
    if ('waiting' in result) {
      return { status: 'queued' as const, waiting: this.matchmaker.size() };
    }

    return this.createTable(result.a, result.b);
  }

  queueLeave(userId: string) {
    this.matchmaker.dequeue(userId);
  }

  private createTable(a: QueuePlayer, b: QueuePlayer) {
    const tableId = uuid();
    const engine = new HuEngine(
      { userId: a.userId, displayName: a.displayName },
      { userId: b.userId, displayName: b.displayName },
      { tableId },
    );

    const botUserId = isBotUserId(a.userId)
      ? a.userId
      : isBotUserId(b.userId)
        ? b.userId
        : null;

    const room: TableRoom = {
      engine,
      socketByUser: new Map(),
      botUserId,
      actionTimer: null,
      botTimer: null,
      handPauseTimer: null,
      disconnectTimers: new Map(),
    };
    if (a.socketId) room.socketByUser.set(a.userId, a.socketId);
    if (b.socketId) room.socketByUser.set(b.userId, b.socketId);

    this.tables.set(tableId, room);
    this.userTable.set(a.userId, tableId);
    this.userTable.set(b.userId, tableId);

    for (const p of [a, b]) {
      if (!p.socketId) continue;
      const opponent =
        p.userId === a.userId ? b.displayName : a.displayName;
      this.emit(p.socketId, 'match_found', { tableId, opponent });
    }

    this.scheduleActionTimer(tableId);
    this.pushState(tableId);
    this.maybeScheduleBot(tableId);
    return { status: 'matched' as const, tableId };
  }

  bindSocket(userId: string, socketId: string) {
    this.matchmaker.updateSocket(userId, socketId);
    const tableId = this.userTable.get(userId);
    if (!tableId) return;
    const room = this.tables.get(tableId);
    if (!room) return;
    room.socketByUser.set(userId, socketId);
    this.clearDisconnect(tableId, userId);
    this.pushState(tableId);
    this.maybeScheduleBot(tableId);
  }

  handleDisconnect(userId: string, socketId: string) {
    this.matchmaker.dequeue(userId);
    const tableId = this.userTable.get(userId);
    if (!tableId) return;
    const room = this.tables.get(tableId);
    if (!room) return;
    if (room.socketByUser.get(userId) !== socketId) return;

    room.socketByUser.delete(userId);
    const existing = room.disconnectTimers.get(userId);
    if (existing) clearTimeout(existing);

    // vs bot: leaving = forfeit immediately
    if (room.botUserId) {
      this.forfeit(tableId, userId);
      return;
    }

    const timer = setTimeout(() => {
      this.forfeit(tableId, userId);
    }, 30_000);
    room.disconnectTimers.set(userId, timer);

    for (const [, sid] of room.socketByUser) {
      this.emit(sid, 'opponent_disconnected', { graceMs: 30_000 });
    }
  }

  private clearDisconnect(tableId: string, userId: string) {
    const room = this.tables.get(tableId);
    if (!room) return;
    const t = room.disconnectTimers.get(userId);
    if (t) clearTimeout(t);
    room.disconnectTimers.delete(userId);
  }

  applyAction(userId: string, action: ClientAction) {
    if (isBotUserId(userId)) throw new Error('Bot cannot act via client');
    const tableId = this.userTable.get(userId);
    if (!tableId) throw new Error('Not at a table');
    const room = this.tables.get(tableId);
    if (!room) throw new Error('Table gone');

    room.engine.applyAction(userId, action);
    this.clearActionTimer(room);
    this.clearBotTimer(room);
    this.afterEngineTick(tableId);
  }

  private afterEngineTick(tableId: string) {
    const room = this.tables.get(tableId);
    if (!room) return;
    const { status } = room.engine;

    if (status === 'hand_over') {
      this.pushState(tableId);
      this.scheduleNextHand(tableId);
      return;
    }
    if (status === 'match_over') {
      void this.persistMatch(room);
      this.pushState(tableId);
      this.scheduleCleanup(tableId);
      return;
    }

    this.scheduleActionTimer(tableId);
    this.pushState(tableId);
    this.maybeScheduleBot(tableId);
  }

  private scheduleNextHand(tableId: string) {
    const room = this.tables.get(tableId);
    if (!room) return;
    if (room.handPauseTimer) clearTimeout(room.handPauseTimer);
    room.handPauseTimer = setTimeout(() => {
      const r = this.tables.get(tableId);
      if (!r) return;
      if (r.engine.status === 'match_over') return;
      r.engine.continueIfNeeded();
      this.afterEngineTick(tableId);
    }, 2200);
  }

  private scheduleCleanup(tableId: string) {
    setTimeout(() => this.destroyTable(tableId), 8_000);
  }

  private forfeit(tableId: string, loserId: string) {
    const room = this.tables.get(tableId);
    if (!room || room.engine.status === 'match_over') return;
    room.engine.forfeit(loserId);
    void this.persistMatch(room);
    this.pushState(tableId);
    for (const [, sid] of room.socketByUser) {
      this.emit(sid, 'opponent_forfeit', {
        winnerId: room.engine.winnerUserId,
      });
    }
    this.scheduleCleanup(tableId);
  }

  private scheduleActionTimer(tableId: string) {
    const room = this.tables.get(tableId);
    if (!room || room.engine.actor == null) return;
    // Bot turn uses bot timer, not human timeout fold
    if (room.botUserId && room.engine.actor != null) {
      const actorId = room.engine.players[room.engine.actor]?.userId;
      if (actorId && isBotUserId(actorId)) return;
    }
    this.clearActionTimer(room);
    const deadline =
      room.engine.actionDeadlineMs ?? Date.now() + room.engine.actionMs;
    const delay = Math.max(500, deadline - Date.now());
    room.actionTimer = setTimeout(() => {
      const r = this.tables.get(tableId);
      if (!r || r.engine.status !== 'active') return;
      try {
        r.engine.timeoutAction();
      } catch (e) {
        this.log.warn(`timeout action failed: ${(e as Error).message}`);
        return;
      }
      this.afterEngineTick(tableId);
    }, delay);
  }

  private maybeScheduleBot(tableId: string) {
    const room = this.tables.get(tableId);
    if (!room?.botUserId || room.engine.status !== 'active') return;
    if (room.engine.actor == null) return;
    const actorId = room.engine.players[room.engine.actor]?.userId;
    if (!actorId || actorId !== room.botUserId) return;

    this.clearBotTimer(room);
    const think = 700 + Math.floor(Math.random() * 900);
    room.botTimer = setTimeout(() => {
      const r = this.tables.get(tableId);
      if (!r?.botUserId || r.engine.status !== 'active') return;
      if (r.engine.actor == null) return;
      const id = r.engine.players[r.engine.actor]?.userId;
      if (id !== r.botUserId) return;
      try {
        const action = pickBotAction(r.engine.legalActions(r.botUserId));
        if (!action) return;
        r.engine.applyAction(r.botUserId, action);
        this.clearActionTimer(r);
        this.afterEngineTick(tableId);
      } catch (e) {
        this.log.warn(`bot action failed: ${(e as Error).message}`);
      }
    }, think);
  }

  private clearBotTimer(room: TableRoom) {
    if (room.botTimer) clearTimeout(room.botTimer);
    room.botTimer = null;
  }

  private clearActionTimer(room: TableRoom) {
    if (room.actionTimer) clearTimeout(room.actionTimer);
    room.actionTimer = null;
  }

  pushState(tableId: string) {
    const room = this.tables.get(tableId);
    if (!room) return;
    for (const [userId, socketId] of room.socketByUser) {
      if (isBotUserId(userId)) continue;
      const view: HuView = room.engine.viewFor(userId);
      this.emit(socketId, 'table_state', view);
    }
  }

  private async persistMatch(room: TableRoom) {
    try {
      const [a, b] = room.engine.players;
      await this.matches.create({
        _id: room.engine.tableId,
        playerA: a.userId,
        playerB: b.userId,
        nameA: a.displayName,
        nameB: b.displayName,
        winnerId: room.engine.winnerUserId,
        handsPlayed: room.engine.handNumber,
        createdAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      });
      if (
        room.engine.winnerUserId &&
        !isBotUserId(a.userId) &&
        !isBotUserId(b.userId)
      ) {
        await this.arena.recordHuMatch({
          playerA: { userId: a.userId, displayName: a.displayName },
          playerB: { userId: b.userId, displayName: b.displayName },
          winnerId: room.engine.winnerUserId,
        });
      }
    } catch (e) {
      this.log.warn(`persist match: ${(e as Error).message}`);
    }
  }

  private destroyTable(tableId: string) {
    const room = this.tables.get(tableId);
    if (!room) return;
    this.clearActionTimer(room);
    this.clearBotTimer(room);
    if (room.handPauseTimer) clearTimeout(room.handPauseTimer);
    for (const t of room.disconnectTimers.values()) clearTimeout(t);
    for (const userId of room.socketByUser.keys()) {
      this.userTable.delete(userId);
    }
    for (const p of room.engine.players) {
      this.userTable.delete(p.userId);
    }
    this.tables.delete(tableId);
  }

  viewForUser(userId: string): HuView | null {
    const tableId = this.userTable.get(userId);
    if (!tableId) return null;
    const room = this.tables.get(tableId);
    if (!room) return null;
    return room.engine.viewFor(userId);
  }
}

function pickBotAction(legal: LegalAction[]): ClientAction | null {
  if (!legal.length) return null;
  const check = legal.find((a) => a.type === 'check');
  const call = legal.find((a) => a.type === 'call');
  const fold = legal.find((a) => a.type === 'fold');
  const bet = legal.find((a) => a.type === 'bet');
  const raise = legal.find((a) => a.type === 'raise');
  const allIn = legal.find((a) => a.type === 'all_in');

  const roll = Math.random();

  if (check) {
    if (bet && roll > 0.72) {
      const amount = Math.min(
        bet.max,
        Math.max(bet.min, Math.round(bet.min + (bet.max - bet.min) * 0.25)),
      );
      return { type: 'bet', amount };
    }
    return { type: 'check' };
  }

  if (call) {
    if (raise && roll > 0.82) {
      const amount = Math.min(
        raise.max,
        Math.max(raise.min, Math.round(raise.min + (raise.max - raise.min) * 0.2)),
      );
      return { type: 'raise', amount };
    }
    if (fold && call.amount > 80 && roll < 0.18) return { type: 'fold' };
    if (allIn && call.amount >= allIn.amount) return { type: 'all_in' };
    return { type: 'call' };
  }

  if (fold) return { type: 'fold' };
  if (allIn) return { type: 'all_in' };
  return null;
}
