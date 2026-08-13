import { Injectable } from '@nestjs/common';

export type QueuePlayer = {
  userId: string;
  displayName: string;
  socketId: string;
  enqueuedAt?: number;
};

export const BOT_NAMES = [
  'NovaBTN',
  'FeltFox',
  'RiverKin',
  'AceRail',
  'ChipNest',
  'BlitzSB',
  'PotOdds',
  'FoldEq',
] as const;

@Injectable()
export class HuMatchmaker {
  private queue: QueuePlayer[] = [];

  enqueue(
    player: QueuePlayer,
  ): { waiting: true } | { matched: true; a: QueuePlayer; b: QueuePlayer } {
    const existingIndex = this.queue.findIndex((queued) => queued.userId === player.userId);
    if (existingIndex >= 0) {
      // Reconnects and duplicate client emits must not move a player behind a newcomer.
      const existing = this.queue[existingIndex]!;
      this.queue[existingIndex] = { ...existing, ...player, enqueuedAt: existing.enqueuedAt };
    } else {
      this.queue.push({ ...player, enqueuedAt: Date.now() });
    }

    if (this.queue.length >= 2) {
      const a = this.queue.shift()!;
      const b = this.queue.shift()!;
      return { matched: true, a, b };
    }
    return { waiting: true };
  }

  dequeue(userId: string) {
    this.queue = this.queue.filter((p) => p.userId !== userId);
  }

  peek(userId: string): QueuePlayer | undefined {
    return this.queue.find((q) => q.userId === userId);
  }

  updateSocket(userId: string, socketId: string) {
    const p = this.queue.find((q) => q.userId === userId);
    if (p) p.socketId = socketId;
  }

  size() {
    return this.queue.length;
  }

  /** Take a waiting human if still alone (for bot fill). */
  takeIfStillWaiting(userId: string): QueuePlayer | null {
    const idx = this.queue.findIndex((p) => p.userId === userId);
    if (idx < 0) return null;
    if (this.queue.length >= 2) return null;
    return this.queue.splice(idx, 1)[0] ?? null;
  }
}

export function makeBotPlayer(): QueuePlayer {
  const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]!;
  return {
    userId: `bot:${name.toLowerCase()}:${Date.now()}`,
    displayName: name,
    socketId: '',
  };
}

export function isBotUserId(userId: string) {
  return userId.startsWith('bot:');
}
