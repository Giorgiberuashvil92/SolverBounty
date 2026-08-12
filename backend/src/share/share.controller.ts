import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { ShareService } from './share.service';
import { ShareSendDto, ShareSettingsDto } from './share.dto';

@Controller('share')
@UseGuards(JwtAuthGuard)
export class ShareController {
  constructor(private readonly share: ShareService) {}

  @Get('settings')
  getSettings(@CurrentUser() user: AuthUser) {
    return this.share.getSettings(user.userId);
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() body: ShareSettingsDto,
  ) {
    return this.share.updateSettings(user.userId, body);
  }

  @Post('send')
  send(@CurrentUser() user: AuthUser, @Body() body: ShareSendDto) {
    return this.share.send(user.userId, body);
  }
}
