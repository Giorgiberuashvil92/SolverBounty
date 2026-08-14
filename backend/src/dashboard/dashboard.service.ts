import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DashboardStore } from './store';
import type {
  ChecklistDto,
  CreateKeyHandDto,
  EndSessionDto,
  MentalDto,
  MoneyDto,
  SetupBankrollDto,
  StartSessionDto,
} from './dto';

@Injectable()
export class DashboardService {
  constructor(private readonly store: DashboardStore) {}

  getDashboard(userId: string) {
    return this.store.getSnapshot(userId);
  }

  setupBankroll(userId: string, dto: SetupBankrollDto) {
    return this.wrap(() =>
      this.store.setupBankroll(userId, dto.amountCents, dto.currency),
    );
  }

  deposit(userId: string, dto: MoneyDto) {
    return this.wrap(() =>
      this.store.deposit(userId, dto.amountCents, dto.note),
    );
  }

  withdraw(userId: string, dto: MoneyDto) {
    return this.wrap(() =>
      this.store.withdraw(userId, dto.amountCents, dto.note),
    );
  }

  startSession(userId: string, dto: StartSessionDto) {
    return this.wrap(() => this.store.startSession(userId, dto));
  }

  endSession(userId: string, sessionId: string, dto: EndSessionDto) {
    return this.wrap(
      () => this.store.endSession(userId, sessionId, dto.cashOutCents),
      true,
    );
  }

  updateChecklist(userId: string, sessionId: string, dto: ChecklistDto) {
    return this.wrap(
      () => this.store.updateChecklist(userId, sessionId, dto),
      true,
    );
  }

  updateMental(userId: string, sessionId: string, dto: MentalDto) {
    return this.wrap(
      () => this.store.updateMental(userId, sessionId, dto),
      true,
    );
  }

  addKeyHand(userId: string, sessionId: string, dto: CreateKeyHandDto) {
    return this.wrap(() => this.store.addKeyHand(userId, sessionId, dto), true);
  }

  updateKeyHand(userId: string, sessionId: string, handId: string, dto: CreateKeyHandDto) {
    return this.wrap(() => this.store.updateKeyHand(userId, sessionId, handId, dto), true);
  }

  deleteKeyHand(userId: string, sessionId: string, handId: string) {
    return this.wrap(() => this.store.deleteKeyHand(userId, sessionId, handId), true);
  }

  listReviews(userId: string) {
    return this.store.listReviews(userId);
  }

  weeklyInsights(userId: string) {
    return this.store.weeklyInsights(userId);
  }

  analyzeKeyHand(userId: string, sessionId: string, handId: string) {
    return this.wrap(
      () => this.store.analyzeKeyHand(userId, sessionId, handId),
      true,
    );
  }

  markHandReviewed(userId: string, sessionId: string, handId: string) {
    return this.wrap(
      () => this.store.markHandReviewed(userId, sessionId, handId),
      true,
    );
  }

  recommendDrill(userId: string, sessionId: string) {
    return this.wrap(() => this.store.recommendDrill(userId, sessionId), true);
  }

  generateDrill(userId: string, sessionId: string) {
    return this.wrap(() => this.store.generateDrill(userId, sessionId), true);
  }

  private async wrap<T>(fn: () => Promise<T>, notFound = false): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      const msg = (e as Error).message;
      if (
        notFound &&
        (msg === 'Session not found' || msg === 'Hand not found')
      ) {
        throw new NotFoundException(msg);
      }
      if (
        msg === 'Session not found' ||
        msg === 'User not found' ||
        msg === 'Hand not found'
      ) {
        throw new NotFoundException(msg);
      }
      throw new BadRequestException(msg);
    }
  }
}
