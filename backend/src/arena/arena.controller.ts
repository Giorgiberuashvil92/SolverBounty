import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { ArenaService } from './arena.service';
import { SubmitRankedDto } from './arena.dto';

@Controller('arena')
@UseGuards(JwtAuthGuard)
export class ArenaController {
  constructor(private readonly arena: ArenaService) {}

  @Get('season')
  getSeason(@CurrentUser() user: AuthUser, @Query('day') day?: string) {
    return this.arena.getSeason(user.userId, day);
  }

  @Post('ranked/submit')
  submitRanked(@CurrentUser() user: AuthUser, @Body() body: SubmitRankedDto) {
    return this.arena.submitRanked(user.userId, body);
  }
}
