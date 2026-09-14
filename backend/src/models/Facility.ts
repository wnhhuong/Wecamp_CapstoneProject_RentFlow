import { Schema, model, Document, Types } from 'mongoose';

/** FACILITY: 1 thiết bị/nội thất cụ thể, thuộc 1 FACILITY_TYPE và đặt tại 1 ROOM. */
export interface IFacility extends Document {
  typeID: Types.ObjectId; // ref FacilityType
  roomID: Types.ObjectId; // ref Room
  lastModified: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FacilitySchema = new Schema<IFacility>(
  {
    typeID: { type: Schema.Types.ObjectId, ref: 'FacilityType', required: true, index: true },
    roomID: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    lastModified: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

export default model<IFacility>('Facility', FacilitySchema);