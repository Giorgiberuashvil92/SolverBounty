import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../dashboard/schemas';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [ShareController],
  providers: [ShareService],
})
export class ShareModule {}
