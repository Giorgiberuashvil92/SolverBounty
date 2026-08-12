import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';
import { CoachThread, CoachThreadSchema } from './coach.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CoachThread.name, schema: CoachThreadSchema },
    ]),
  ],
  controllers: [CoachController],
  providers: [CoachService],
})
export class CoachModule {}
