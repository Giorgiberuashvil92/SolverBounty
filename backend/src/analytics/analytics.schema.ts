import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AnalyticsEventDoc = HydratedDocument<AnalyticsEvent>;

@Schema({ collection: 'analytics_events', timestamps: false })
export class AnalyticsEvent {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  event!: string;

  @Prop({ type: Object, default: {} })
  properties!: Record<string, unknown>;

  @Prop({ required: true, index: true })
  createdAt!: string;
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);
AnalyticsEventSchema.index({ event: 1, createdAt: -1 });
