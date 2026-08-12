import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { AnalyticsService } from '../analytics/analytics.service';
import { CoachThread } from './coach.schema';
import {
  chatWithLlm,
  heuristicCoachReply,
  heuristicParseHand,
  parseHandWithLlm,
  streamChatWithLlm,
} from './llm';
import type { ChatDto, ParseHandDto } from './coach.dto';

@Injectable()
export class CoachService {
  constructor(
    @InjectModel(CoachThread.name)
    private readonly threads: Model<CoachThread>,
    private readonly config: ConfigService,
    private readonly analytics: AnalyticsService,
  ) {}

  async listThreads(userId: string) {
    const threads = await this.threads
      .find({ userId })
      .sort({ updatedAt: -1 })
      .limit(40)
      .lean();

    return threads
      .map((thread) => {
        const messages = thread.messages ?? [];
        if (!messages.length) return null;
        const firstUser = messages.find((m) => m.role === 'user');
        const preview = (firstUser?.content ?? messages[0]?.content ?? 'Chat')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 96);
        return {
          id: String(thread._id),
          preview,
          messageCount: messages.length,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
        };
      })
      .filter(Boolean);
  }

  async getThread(userId: string, threadId?: string) {
    const thread = threadId
      ? await this.threads.findOne({ _id: threadId, userId }).lean()
      : await this.threads.findOne({ userId }).sort({ updatedAt: -1 }).lean();

    if (!thread) {
      if (threadId) throw new NotFoundException('Thread not found');
      return {
        id: null,
        messages: [] as const,
        createdAt: null,
        updatedAt: null,
      };
    }
    return this.toDto(thread);
  }

  async newThread(userId: string) {
    const latest = await this.threads
      .findOne({ userId })
      .sort({ updatedAt: -1 });
    if (latest && (latest.messages?.length ?? 0) === 0) {
      return this.toDto(latest);
    }

    const now = new Date().toISOString();
    const thread = await this.threads.create({
      _id: uuid(),
      userId,
      messages: [],
      createdAt: now,
      updatedAt: now,
    });
    await this.analytics.track(userId, 'coach_new_thread', {});
    return this.toDto(thread);
  }

  async deleteThread(userId: string, threadId: string) {
    const deleted = await this.threads.findOneAndDelete({
      _id: threadId,
      userId,
    });
    if (!deleted) throw new NotFoundException('Thread not found');
    await this.analytics.track(userId, 'coach_delete_thread', {});
    return { ok: true as const, id: threadId };
  }

  async chat(userId: string, dto: ChatDto) {
    const now = new Date().toISOString();
    let thread = dto.threadId
      ? await this.threads.findOne({ _id: dto.threadId, userId })
      : await this.threads.findOne({ userId }).sort({ updatedAt: -1 });

    if (dto.threadId && !thread) {
      throw new NotFoundException('Thread not found');
    }

    if (!thread) {
      thread = await this.threads.create({
        _id: uuid(),
        userId,
        messages: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    const userMsg = {
      id: uuid(),
      role: 'user' as const,
      content: dto.message.trim(),
      createdAt: now,
    };
    thread.messages.push(userMsg);

    const history = thread.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const llm = await chatWithLlm(this.config, history);
    const reply = llm ?? heuristicCoachReply(dto.message);
    const assistantMsg = {
      id: uuid(),
      role: 'assistant' as const,
      content: reply,
      createdAt: new Date().toISOString(),
    };
    thread.messages.push(assistantMsg);
    thread.updatedAt = assistantMsg.createdAt;
    await thread.save();

    await this.analytics.track(userId, 'coach_message', {
      usedLlm: Boolean(llm),
      messageLen: dto.message.length,
    });

    return this.toDto(thread);
  }

  async chatStream(
    userId: string,
    dto: ChatDto,
    onDelta: (delta: string) => void,
  ) {
    const now = new Date().toISOString();
    let thread = dto.threadId
      ? await this.threads.findOne({ _id: dto.threadId, userId })
      : await this.threads.findOne({ userId }).sort({ updatedAt: -1 });

    if (dto.threadId && !thread) {
      throw new NotFoundException('Thread not found');
    }

    if (!thread) {
      thread = await this.threads.create({
        _id: uuid(),
        userId,
        messages: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    const userMsg = {
      id: uuid(),
      role: 'user' as const,
      content: dto.message.trim(),
      createdAt: now,
    };
    thread.messages.push(userMsg);

    const history = thread.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const llm = await streamChatWithLlm(this.config, history, onDelta);
    const reply = llm ?? heuristicCoachReply(dto.message);
    if (!llm) onDelta(reply);
    const assistantMsg = {
      id: uuid(),
      role: 'assistant' as const,
      content: reply,
      createdAt: new Date().toISOString(),
    };
    thread.messages.push(assistantMsg);
    thread.updatedAt = assistantMsg.createdAt;
    await thread.save();

    await this.analytics.track(userId, 'coach_message', {
      usedLlm: Boolean(llm),
      messageLen: dto.message.length,
      streamed: true,
    });

    return this.toDto(thread);
  }

  async parseHand(userId: string, dto: ParseHandDto) {
    const llm = await parseHandWithLlm(this.config, dto.transcript, dto.stakes);
    const result = llm
      ? { ...llm, source: 'llm' as const }
      : heuristicParseHand(dto.transcript, dto.stakes);

    await this.analytics.track(userId, 'coach_parse_hand', {
      usedLlm: Boolean(llm),
      confidence: (result as { confidence?: number }).confidence,
    });

    return result;
  }

  private toDto(thread: CoachThread) {
    return {
      id: String(thread._id),
      messages: (thread.messages ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    };
  }
}
