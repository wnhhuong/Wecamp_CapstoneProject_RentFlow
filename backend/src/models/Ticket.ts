import { Schema, model, Document, Types } from 'mongoose';
import { TicketStatus } from './enums.js';

/** TICKET: phiếu báo hỏng/sửa chữa cho 1 ROOM. */
export interface ITicket extends Document {
  roomID: Types.ObjectId; // ref Room
  ticketName: string;
  createDate: Date;
  resolveDate?: Date;
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    roomID: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    ticketName: { type: String, required: true, trim: true },
    createDate: { type: Date, required: true, default: Date.now },
    resolveDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      required: true,
      default: TicketStatus.NEED_ACTION,
    },
  },
  { timestamps: true },
);

export default model<ITicket>('Ticket', TicketSchema);