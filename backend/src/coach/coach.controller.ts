import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
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

  @Post('parse-hand')
  parseHand(@CurrentUser() user: AuthUser, @Body() body: ParseHandDto) {
    return this.coach.parseHand(user.userId, body);
  }
}
