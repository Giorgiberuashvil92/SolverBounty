import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardStore } from './store';
import { PokerSession, PokerSessionSchema, User, UserSchema } from './schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PokerSession.name, schema: PokerSessionSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardStore, DashboardService],
  exports: [DashboardStore],
})
export class DashboardModule {}
