import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { CoachService } from './coach.service';
import { ChatDto, ParseHandDto } from './coach.dto';

@Controller('coach')
@UseGuards(JwtAuthGuard)
export class CoachController {
  constructor(private readonly coach: CoachService) {}

  @Get('threads')
  listThreads(@CurrentUser() user: AuthUser) {
    return this.coach.listThreads(user.userId);
  }

  @Get('thread')
  getLatestThread(@CurrentUser() user: AuthUser) {
    return this.coach.getThread(user.userId);
  }

  @Get('thread/:id')
  getThread(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.coach.getThread(user.userId, id);
  }

  @Post('thread/new')
  newThread(@CurrentUser() user: AuthUser) {
    return this.coach.newThread(user.userId);
  }

  @Delete('thread/:id')
  deleteThread(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.coach.deleteThread(user.userId, id);
  }

  @Post('chat')
  chat(@CurrentUser() user: AuthUser, @Body() body: ChatDto) {
    return this.coach.chat(user.userId, body);
  }

  @Post('chat/stream')
  async chatStream(
    @CurrentUser() user: AuthUser,
    @Body() body: ChatDto,
    @Res() res: Response,
  ) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const thread = await this.coach.chatStream(user.userId, body, (delta) => {
        send({ type: 'delta', delta });
      });
      send({ type: 'done', thread });
    } catch (error) {
      send({ type: 'error', message: (error as Error).message || 'Coach unavailable' });
    } finally {
      res.end();
    }
  }

  @Post('parse-hand')
  parseHand(@CurrentUser() user: AuthUser, @Body() body: ParseHandDto) {
    return this.coach.parseHand(user.userId, body);
  }
}
