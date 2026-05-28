import mongoose, { Schema, Document, Types } from 'mongoose';
import { CaseStatus, CaseVerdict } from '@ops-cases/shared';

export interface ICase extends Document {
  _id: Types.ObjectId;
  caseNumber: string;
  clientId: Types.ObjectId;
  assigneeId?: Types.ObjectId;
  status: CaseStatus;
  caseType: string;
  dueAt?: Date;
  slaBreachedAt?: Date;
  verdict?: CaseVerdict;
  closedAt?: Date;
}

const caseSchema = new Schema<ICase>(
  {
    caseNumber: { type: String, required: true, unique: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: Object.values(CaseStatus),
      required: true,
      default: CaseStatus.Draft,
    },
    caseType: { type: String, required: true },
    dueAt: { type: Date },
    slaBreachedAt: { type: Date },
    verdict: { type: String, enum: Object.values(CaseVerdict) },
    closedAt: { type: Date },
  },
  { timestamps: true },
);

caseSchema.index({ status: 1, dueAt: 1 });
caseSchema.index({ assigneeId: 1, status: 1 });
caseSchema.index({ clientId: 1, createdAt: -1 });

export const Case = mongoose.model<ICase>('Case', caseSchema);
