import { Schema, model, Document, Types } from 'mongoose';
import { RoomStatus } from './enums.js';

/** ROOM: phòng trọ cụ thể, thuộc 1 AREA. */
export interface IRoom extends Document {
  areaID: Types.ObjectId; // ref Area
  status: RoomStatus;
  maxPeople: number;
  roomDetail: string;
  images: string[];
  roomCode: string;
  floor: number;
  price: number;
  deposit: number;
  availableFrom: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    areaID: { type: Schema.Types.ObjectId, ref: 'Area', required: true, index: true },
    status: {
      type: String,
      enum: Object.values(RoomStatus),
      required: true,
      default: RoomStatus.AVAILABLE_NOW,
    },
    maxPeople: { type: Number, required: true, min: 1 },
    roomDetail: { type: String, default: '' },
    images: { type: [String], default: [] },
    roomCode: { type: String, required: true, unique: true, trim: true },
    floor: { type: Number, required: true },
    price: { type: Number, required: true, min: 0 },
    deposit: { type: Number, required: true, min: 0 },
    availableFrom: { type: Date, required: true },
  },
  { timestamps: true },
);

export default model<IRoom>('Room', RoomSchema);