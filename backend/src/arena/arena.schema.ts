import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ArenaEntryDoc = HydratedDocument<ArenaEntry>;

@Schema({ collection: 'arena_entries', timestamps: false })
export class ArenaEntry {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  weekKey!: string;

  @Prop({ required: true })
  displayName!: string;

  @Prop({ required: true, default: 0 })
  lp!: number;

  @Prop({ required: true, default: 0 })
  answered!: number;

  @Prop({ required: true, default: 0 })
  best!: number;

  @Prop({ required: true, default: 0 })
  ok!: number;

  @Prop({ required: true, default: 0 })
  leak!: number;

  @Prop({ required: true, default: 0 })
  huWins!: number;

  @Prop({ required: true, default: 0 })
  huLosses!: number;

  @Prop({ required: true, default: 0 })
  huPlayed!: number;

  /** Last calendar day (YYYY-MM-DD) the player submitted ranked. */
  @Prop({ type: String, default: null })
  rankedDoneDay!: string | null;

  @Prop({ required: true })
  createdAt!: string;

  @Prop({ required: true })
  updatedAt!: string;
}

export const ArenaEntrySchema = SchemaFactory.createForClass(ArenaEntry);
ArenaEntrySchema.index({ weekKey: 1, lp: -1 });
ArenaEntrySchema.index({ weekKey: 1, userId: 1 }, { unique: true });
