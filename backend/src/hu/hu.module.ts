import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ArenaModule } from '../arena/arena.module';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../dashboard/schemas';
import { HuGateway } from './hu.gateway';
import { HuMatchmaker } from './hu.matchmaker';
import { HuMatch, HuMatchSchema } from './hu.schema';
import { HuService } from './hu.service';

@Module({
  imports: [
    AuthModule,
    ArenaModule,
    MongooseModule.forFeature([
      { name: HuMatch.name, schema: HuMatchSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [HuGateway, HuService, HuMatchmaker],
})
export class HuModule {}
