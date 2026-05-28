import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClient extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
}

const clientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
  },
  { timestamps: true },
);

export const Client = mongoose.model<IClient>('Client', clientSchema);
