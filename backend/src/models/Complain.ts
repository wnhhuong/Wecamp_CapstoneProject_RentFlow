import { Schema, model, Document, Types } from 'mongoose';

/** COMPLAIN: khiếu nại của người thuê, gắn với 1 AREA và/hoặc 1 ROOM. */
export interface IComplain extends Document {
  ticketID: Types.ObjectId; // ref Ticket (1-1)
  areaID: Types.ObjectId; // ref Area
  roomID?: Types.ObjectId; // ref Room (optional - có thể khiếu nại chung cả khu)
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const ComplainSchema = new Schema<IComplain>(
  {
    ticketID: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      unique: true,
      index: true,
    },
    areaID: { type: Schema.Types.ObjectId, ref: 'Area', required: true, index: true },
    roomID: { type: Schema.Types.ObjectId, ref: 'Room', index: true },
    description: { type: String, required: true },
  },
  { timestamps: true },
);

export default model<IComplain>('Complain', ComplainSchema);
