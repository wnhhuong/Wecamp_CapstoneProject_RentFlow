import { Schema, model, Document } from 'mongoose';

/** FACILITY_TYPE: loại thiết bị/nội thất (máy lạnh, giường, tủ...). */
export interface IFacilityType extends Document {
  typeName: string;
  createdAt: Date;
  updatedAt: Date;
}

const FacilityTypeSchema = new Schema<IFacilityType>(
  {
    typeName: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true },
);

export default model<IFacilityType>('FacilityType', FacilityTypeSchema);