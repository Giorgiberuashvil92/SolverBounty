import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CoachThreadDoc = HydratedDocument<CoachThread>;

@Schema({ _id: false })
export class CoachMessage {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true, enum: ['user', 'assistant', 'system'] })
  role!: 'user' | 'assistant' | 'system';

  @Prop({ required: true })
  content!: string;

  @Prop({ required: true })
  createdAt!: string;
}

@Schema({ collection: 'coach_threads', timestamps: false })
export class CoachThread {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ type: [CoachMessage], default: [] })
  messages!: CoachMessage[];

  @Prop({ required: true })
  createdAt!: string;

  @Prop({ required: true })
  updatedAt!: string;
}

export const CoachThreadSchema = SchemaFactory.createForClass(CoachThread);
CoachThreadSchema.index({ userId: 1, updatedAt: -1 });
