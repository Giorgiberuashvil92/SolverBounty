import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import {
  ChecklistDto,
  CreateKeyHandDto,
  EndSessionDto,
  MentalDto,
  MoneyDto,
  SetupBankrollDto,
  StartSessionDto,
} from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.dashboard.getDashboard(user.userId);
  }

  @Get('reviews')
  listReviews(@CurrentUser() user: AuthUser) {
    return this.dashboard.listReviews(user.userId);
  }

  @Get('insights/weekly')
  weeklyInsights(@CurrentUser() user: AuthUser) {
    return this.dashboard.weeklyInsights(user.userId);
  }

  @Post('bankroll/setup')
  setupBankroll(@CurrentUser() user: AuthUser, @Body() body: SetupBankrollDto) {
    return this.dashboard.setupBankroll(user.userId, body);
  }

  @Post('bankroll/deposit')
  deposit(@CurrentUser() user: AuthUser, @Body() body: MoneyDto) {
    return this.dashboard.deposit(user.userId, body);
  }

  @Post('bankroll/withdraw')
  withdraw(@CurrentUser() user: AuthUser, @Body() body: MoneyDto) {
    return this.dashboard.withdraw(user.userId, body);
  }

  @Post('sessions/start')
  startSession(@CurrentUser() user: AuthUser, @Body() body: StartSessionDto) {
    return this.dashboard.startSession(user.userId, body);
  }

  @Post('sessions/:id/end')
  endSession(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: EndSessionDto,
  ) {
    return this.dashboard.endSession(user.userId, id, body);
  }

  @Patch('sessions/:id/checklist')
  updateChecklist(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: ChecklistDto,
  ) {
    return this.dashboard.updateChecklist(user.userId, id, body);
  }

  @Patch('sessions/:id/mental')
  updateMental(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: MentalDto,
  ) {
    return this.dashboard.updateMental(user.userId, id, body);
  }

  @Post('sessions/:id/key-hands')
  addKeyHand(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: CreateKeyHandDto,
  ) {
    return this.dashboard.addKeyHand(user.userId, id, body);
  }

  @Post('sessions/:sessionId/key-hands/:handId/analyze')
  analyzeKeyHand(
    @CurrentUser() user: AuthUser,
    @Param('sessionId') sessionId: string,
    @Param('handId') handId: string,
  ) {
    return this.dashboard.analyzeKeyHand(user.userId, sessionId, handId);
  }

  @Patch('sessions/:sessionId/key-hands/:handId')
  updateKeyHand(@CurrentUser() user: AuthUser, @Param('sessionId') sessionId: string, @Param('handId') handId: string, @Body() body: CreateKeyHandDto) {
    return this.dashboard.updateKeyHand(user.userId, sessionId, handId, body);
  }

  @Delete('sessions/:sessionId/key-hands/:handId')
  deleteKeyHand(@CurrentUser() user: AuthUser, @Param('sessionId') sessionId: string, @Param('handId') handId: string) {
    return this.dashboard.deleteKeyHand(user.userId, sessionId, handId);
  }

  @Post('sessions/:sessionId/key-hands/:handId/reviewed')
  markReviewed(
    @CurrentUser() user: AuthUser,
    @Param('sessionId') sessionId: string,
    @Param('handId') handId: string,
  ) {
    return this.dashboard.markHandReviewed(user.userId, sessionId, handId);
  }

  @Post('sessions/:id/drill-recommendation')
  recommendDrill(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dashboard.recommendDrill(user.userId, id);
  }

  @Post('sessions/:id/generated-drill')
  generateDrill(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dashboard.generateDrill(user.userId, id);
  }
}
