import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { User } from '../dashboard/schemas';
import { ArenaEntry } from './arena.schema';
import type { SubmitRankedDto } from './arena.dto';

/** House seed for the weekly prize bankroll (cents). */
const HOUSE_POT_CENTS = 50_000; // $500
/** Each unique entrant adds this to the pool (virtual buy-in). */
const ENTRY_CENTS = 500; // $5
const BOARD_LIMIT = 40;
const HU_WIN_LP = 100;
const HU_LOSS_LP = 20;

function weekKeyFromDay(day: string): string {
  const d = new Date(`${day}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid day');
  const dayIdx = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - dayIdx);
  return d.toISOString().slice(0, 10);
}

function weekEndsAt(weekKey: string): string {
  const d = new Date(`${weekKey}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

function accuracyPct(best: number, ok: number, answered: number): number {
  if (!answered) return 0;
  return Math.round(((best + 0.4 * ok) / answered) * 100);
}

function prizeSplits(poolCents: number) {
  const first = Math.round(poolCents * 0.5);
  const second = Math.round(poolCents * 0.25);
  const third = Math.round(poolCents * 0.15);
  const rest = Math.max(0, poolCents - first - second - third);
  const share = Math.floor(rest / 7);
  return [
    { place: '1st', title: formatMoney(first), detail: '50% of bankroll pool', cents: first },
    { place: '2nd', title: formatMoney(second), detail: '25% of bankroll pool', cents: second },
    { place: '3rd', title: formatMoney(third), detail: '15% of bankroll pool', cents: third },
    {
      place: '4–10',
      title: formatMoney(share),
      detail: 'Split of remaining 10%',
      cents: share,
    },
  ];
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

@Injectable()
export class ArenaService {
  constructor(
    @InjectModel(ArenaEntry.name)
    private readonly entries: Model<ArenaEntry>,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  async getSeason(userId: string, day?: string) {
    const today = day && /^\d{4}-\d{2}-\d{2}$/.test(day)
      ? day
      : new Date().toISOString().slice(0, 10);
    const weekKey = weekKeyFromDay(today);
    const [me, entrants, board] = await Promise.all([
      this.entries.findOne({ userId, weekKey }).lean(),
      this.entries.countDocuments({ weekKey }),
      this.buildBoard(weekKey, userId),
    ]);

    const prizePoolCents = HOUSE_POT_CENTS + entrants * ENTRY_CENTS;
    const you = board.you;

    return {
      weekKey,
      endsAt: weekEndsAt(weekKey),
      day: today,
      housePotCents: HOUSE_POT_CENTS,
      entryCents: ENTRY_CENTS,
      entrants,
      prizePoolCents,
      prizes: prizeSplits(prizePoolCents),
      you: you
        ? {
            rank: board.youRank,
            lp: you.lp,
            answered: you.answered,
            best: you.best ?? 0,
            ok: you.ok ?? 0,
            leak: me?.leak ?? 0,
            huWins: you.huWins ?? 0,
            huLosses: you.huLosses ?? 0,
            huPlayed: you.huPlayed ?? 0,
            accuracy: you.accuracy,
            rankedDoneDay: me?.rankedDoneDay ?? null,
          }
        : {
            rank: null as number | null,
            lp: 0,
            answered: 0,
            best: 0,
            ok: 0,
            leak: 0,
            huWins: 0,
            huLosses: 0,
            huPlayed: 0,
            accuracy: 0,
            rankedDoneDay: null as string | null,
          },
      rows: board.rows,
    };
  }

  async submitRanked(userId: string, dto: SubmitRankedDto) {
    const sum = dto.best + dto.ok + dto.leak;
    if (sum !== dto.answered) {
      throw new BadRequestException('Spot counts must add up');
    }
    const expectedLp = dto.best * 100 + dto.ok * 40;
    if (dto.lpGained !== expectedLp) {
      throw new BadRequestException('LP does not match spot qualities');
    }

    const weekKey = weekKeyFromDay(dto.day);
    const now = new Date().toISOString();
    const user = await this.users.findById(userId).lean();
    const displayName = user?.displayName?.trim() || user?.email?.split('@')[0] || 'Player';

    let entry = await this.entries.findOne({ userId, weekKey });
    if (entry?.rankedDoneDay === dto.day) {
      throw new ConflictException('Ranked already submitted for today');
    }

    if (!entry) {
      entry = await this.entries.create({
        _id: uuid(),
        userId,
        weekKey,
        displayName,
        lp: 0,
        answered: 0,
        best: 0,
        ok: 0,
        leak: 0,
        huWins: 0,
        huLosses: 0,
        huPlayed: 0,
        rankedDoneDay: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    entry.displayName = displayName;
    entry.lp += dto.lpGained;
    entry.answered += dto.answered;
    entry.best += dto.best;
    entry.ok += dto.ok;
    entry.leak += dto.leak;
    entry.rankedDoneDay = dto.day;
    entry.updatedAt = now;
    await entry.save();

    return this.getSeason(userId, dto.day);
  }

  async recordHuMatch(input: {
    playerA: { userId: string; displayName: string };
    playerB: { userId: string; displayName: string };
    winnerId: string | null;
    day?: string;
  }) {
    const day = input.day ?? new Date().toISOString().slice(0, 10);
    const weekKey = weekKeyFromDay(day);
    const now = new Date().toISOString();

    await Promise.all(
      [input.playerA, input.playerB].map(async (player) => {
        const won = input.winnerId === player.userId;
        const lost = input.winnerId != null && !won;
        const lp = won ? HU_WIN_LP : lost ? HU_LOSS_LP : 0;

        await this.entries.updateOne(
          { userId: player.userId, weekKey },
          {
            $setOnInsert: {
              _id: uuid(),
              userId: player.userId,
              weekKey,
              createdAt: now,
              answered: 0,
              best: 0,
              ok: 0,
              leak: 0,
              rankedDoneDay: null,
            },
            $set: {
              displayName: player.displayName,
              updatedAt: now,
            },
            $inc: {
              lp,
              huPlayed: 1,
              huWins: won ? 1 : 0,
              huLosses: lost ? 1 : 0,
            },
          },
          { upsert: true },
        );
      }),
    );
  }

  private async buildBoard(weekKey: string, userId: string) {
    const docs = await this.entries
      .find({ weekKey })
      .sort({ lp: -1, answered: -1, updatedAt: 1 })
      .limit(BOARD_LIMIT)
      .lean();

    const rows = docs.map((d) => ({
      id: String(d.userId),
      name: d.displayName,
      lp: d.lp,
      accuracy: accuracyPct(d.best, d.ok, d.answered),
      answered: d.answered,
      best: d.best,
      ok: d.ok,
      huWins: d.huWins ?? 0,
      huLosses: d.huLosses ?? 0,
      huPlayed: d.huPlayed ?? 0,
      isYou: d.userId === userId,
    }));

    const youIdx = rows.findIndex((r) => r.isYou);
    let you = youIdx >= 0 ? rows[youIdx] : null;
    let youRank = youIdx >= 0 ? youIdx + 1 : 0;

    if (!you) {
      const mine = await this.entries.findOne({ userId, weekKey }).lean();
      if (mine) {
        const better = await this.entries.countDocuments({
          weekKey,
          $or: [
            { lp: { $gt: mine.lp } },
            {
              lp: mine.lp,
              answered: { $gt: mine.answered },
            },
          ],
        });
        youRank = better + 1;
        you = {
          id: userId,
          name: mine.displayName,
          lp: mine.lp,
          accuracy: accuracyPct(mine.best, mine.ok, mine.answered),
          answered: mine.answered,
          best: mine.best,
          ok: mine.ok,
          huWins: mine.huWins ?? 0,
          huLosses: mine.huLosses ?? 0,
          huPlayed: mine.huPlayed ?? 0,
          isYou: true,
        };
        rows.push(you);
        rows.sort((a, b) => {
          if (b.lp !== a.lp) return b.lp - a.lp;
          return b.answered - a.answered;
        });
      }
    }

    return { rows, youRank, you };
  }
}
