import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudyController } from './study.controller';
import { StudyService } from './study.service';
import { StudyRange, StudyRangeSchema } from './study.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StudyRange.name, schema: StudyRangeSchema },
    ]),
  ],
  controllers: [StudyController],
  providers: [StudyService],
})
export class StudyModule {}
