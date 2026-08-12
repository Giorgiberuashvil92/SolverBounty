import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { AnalyticsEvent } from './analytics.schema';
import { User } from '../dashboard/schemas';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(AnalyticsEvent.name)
    private readonly events: Model<AnalyticsEvent>,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  async track(
    userId: string,
    event: string,
    properties: Record<string, unknown> = {},
  ) {
    const user = await this.users.findById(userId).lean();
    if (user && user.consents?.analytics === false) return null;

    return this.events.create({
      _id: uuid(),
      userId,
      event,
      properties,
      createdAt: new Date().toISOString(),
    });
  }

  /** Anonymized aggregates — only users who opted into partnerInsights. */
  async partnerInsightsSummary() {
    const optedIn = await this.users
      .find({ 'consents.partnerInsights': true })
      .select('_id')
      .lean();
    const ids = optedIn.map((u) => u._id);
    if (!ids.length) {
      return {
        optedInUsers: 0,
        note: 'No users opted into partner insights yet.',
        stakes: {},
        events: {},
      };
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const rows = await this.events
      .find({ userId: { $in: ids }, createdAt: { $gte: since } })
      .lean();

    const stakes: Record<string, number> = {};
    const events: Record<string, number> = {};
    for (const row of rows) {
      events[row.event] = (events[row.event] ?? 0) + 1;
      const s = row.properties?.stakesLabel;
      if (typeof s === 'string') stakes[s] = (stakes[s] ?? 0) + 1;
    }

    return {
      optedInUsers: ids.length,
      windowDays: 30,
      stakes,
      events,
      note: 'Aggregated only. No emails, hand cards, or raw PII included.',
    };
  }
}
