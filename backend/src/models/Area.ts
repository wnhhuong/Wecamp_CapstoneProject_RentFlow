import { Schema, model, Document } from 'mongoose';

/** AREA: khu vực/dãy trọ, chứa nhiều ROOM. */
export interface IArea extends Document {
  areaName: string;
  createdAt: Date;
  updatedAt: Date;
}

const AreaSchema = new Schema<IArea>(
  {
    areaName: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export default model<IArea>('Area', AreaSchema);