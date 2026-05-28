import mongoose, { Schema, Document, Types } from 'mongoose';
import { UserRole } from '@ops-cases/shared';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  active: boolean;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), required: true },
    passwordHash: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>('User', userSchema);
