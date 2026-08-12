import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('partner-insights')
  @UseGuards(JwtAuthGuard)
  partnerInsights() {
    return this.analytics.partnerInsightsSummary();
  }
}
