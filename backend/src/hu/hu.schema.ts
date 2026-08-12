import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HuMatchDoc = HydratedDocument<HuMatch>;

@Schema({ collection: 'hu_matches', timestamps: false })
export class HuMatch {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, index: true })
  playerA!: string;

  @Prop({ required: true, index: true })
  playerB!: string;

  @Prop()
  nameA?: string;

  @Prop()
  nameB?: string;

  @Prop({ type: String, default: null })
  winnerId!: string | null;

  @Prop({ required: true })
  handsPlayed!: number;

  @Prop({ required: true })
  createdAt!: string;

  @Prop({ required: true })
  endedAt!: string;
}

export const HuMatchSchema = SchemaFactory.createForClass(HuMatch);
