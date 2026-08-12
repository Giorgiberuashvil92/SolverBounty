import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { AnalyticsService } from '../analytics/analytics.service';
import { StudyRange } from './study.schema';
import type { UpsertRangeDto } from './study.dto';

const POSITIONS = new Set(['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']);

@Injectable()
export class StudyService {
  constructor(
    @InjectModel(StudyRange.name)
    private readonly ranges: Model<StudyRange>,
    private readonly analytics: AnalyticsService,
  ) {}

  async getRange(userId: string, position: string) {
    const pos = position.toUpperCase();
    if (!POSITIONS.has(pos)) {
      throw new BadRequestException(`Unknown position: ${position}`);
    }
    const doc = await this.ranges.findOne({ userId, position: pos }).lean();
    return {
      position: pos,
      cells: (doc?.cells as Record<string, unknown>) ?? {},
      updatedAt: doc?.updatedAt ?? null,
    };
  }

  async upsertRange(userId: string, position: string, dto: UpsertRangeDto) {
    const pos = position.toUpperCase();
    if (!POSITIONS.has(pos)) {
      throw new BadRequestException(`Unknown position: ${position}`);
    }

    const now = new Date().toISOString();
    const existing = await this.ranges.findOne({ userId, position: pos });
    const merged: Record<
      string,
      { raise: number; call: number; fold: number; note?: string }
    > = { ...(existing?.cells ?? {}) };

    for (const [label, cell] of Object.entries(dto.cells ?? {})) {
      const raise = clamp01(Number(cell.raise));
      const call = clamp01(Number(cell.call));
      const fold = clamp01(Number(cell.fold));
      const sum = raise + call + fold;
      if (!sum || Number.isNaN(sum)) {
        throw new BadRequestException(`Invalid frequencies for ${label}`);
      }
      merged[label] = {
        raise: raise / sum,
        call: call / sum,
        fold: fold / sum,
        note: typeof cell.note === 'string' ? cell.note.slice(0, 500) : undefined,
      };
    }

    if (existing) {
      existing.cells = merged;
      existing.updatedAt = now;
      existing.markModified('cells');
      await existing.save();
    } else {
      await this.ranges.create({
        _id: uuid(),
        userId,
        position: pos,
        cells: merged,
        updatedAt: now,
      });
    }

    await this.analytics.track(userId, 'study_range_saved', {
      position: pos,
      cellCount: Object.keys(dto.cells).length,
    });

    return this.getRange(userId, pos);
  }
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
