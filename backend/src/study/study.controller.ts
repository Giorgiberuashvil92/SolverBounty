import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { StudyService } from './study.service';
import { UpsertRangeDto } from './study.dto';

@Controller('study')
@UseGuards(JwtAuthGuard)
export class StudyController {
  constructor(private readonly study: StudyService) {}

  @Get('ranges/:position')
  getRange(@CurrentUser() user: AuthUser, @Param('position') position: string) {
    return this.study.getRange(user.userId, position);
  }

  @Put('ranges/:position')
  upsertRange(
    @CurrentUser() user: AuthUser,
    @Param('position') position: string,
    @Body() body: UpsertRangeDto,
  ) {
    return this.study.upsertRange(user.userId, position, body);
  }
}
