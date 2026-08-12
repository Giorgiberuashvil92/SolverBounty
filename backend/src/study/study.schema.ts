import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StudyRangeDoc = HydratedDocument<StudyRange>;

@Schema({ _id: false })
export class StudyCellOverride {
  @Prop({ required: true })
  raise!: number;

  @Prop({ required: true })
  call!: number;

  @Prop({ required: true })
  fold!: number;

  @Prop()
  note?: string;
}

@Schema({ collection: 'study_ranges', timestamps: false })
export class StudyRange {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  position!: string;

  @Prop({ type: Object, default: {} })
  cells!: Record<string, StudyCellOverride>;

  @Prop({ required: true })
  updatedAt!: string;
}

export const StudyRangeSchema = SchemaFactory.createForClass(StudyRange);
StudyRangeSchema.index({ userId: 1, position: 1 }, { unique: true });
