import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../dashboard/schemas';
import { ArenaController } from './arena.controller';
import { ArenaService } from './arena.service';
import { ArenaEntry, ArenaEntrySchema } from './arena.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ArenaEntry.name, schema: ArenaEntrySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ArenaController],
  providers: [ArenaService],
  exports: [ArenaService],
})
export class ArenaModule {}
