import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginDto,
  OnboardingDto,
  RegisterDto,
  SocialLoginDto,
} from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, type AuthUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Post('social')
  social(@Body() body: SocialLoginDto) {
    return this.auth.socialLogin(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId);
  }

  @Post('onboarding')
  @UseGuards(JwtAuthGuard)
  onboarding(@CurrentUser() user: AuthUser, @Body() body: OnboardingDto) {
    return this.auth.completeOnboarding(user.userId, body);
  }
}
