import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CoachModule } from './coach/coach.module';
import { StudyModule } from './study/study.module';
import { ShareModule } from './share/share.module';
import { ArenaModule } from './arena/arena.module';
import { HuModule } from './hu/hu.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI');
        if (!uri) {
          throw new Error(
            'MONGODB_URI is missing. Copy backend/.env.example → backend/.env and paste your Atlas connection string.',
          );
        }
        return { uri };
      },
    }),
    AnalyticsModule,
    AuthModule,
    DashboardModule,
    CoachModule,
    StudyModule,
    ShareModule,
    ArenaModule,
    HuModule,
  ],
})
export class AppModule {}
