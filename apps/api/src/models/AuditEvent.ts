import mongoose, { Schema, Document, Types } from 'mongoose';
import { CaseAction, CaseStatus } from '@ops-cases/shared';

export interface IAuditEvent extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  action: CaseAction;
  fromStatus: CaseStatus;
  toStatus: CaseStatus;
  actorId: Types.ObjectId;
  at: Date;
  metadata?: Record<string, unknown>;
}

const auditEventSchema = new Schema<IAuditEvent>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    action: { type: String, enum: Object.values(CaseAction), required: true },
    fromStatus: { type: String, enum: Object.values(CaseStatus), required: true },
    toStatus: { type: String, enum: Object.values(CaseStatus), required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, required: true, default: Date.now },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: false },
);

auditEventSchema.index({ caseId: 1, at: -1 });

export const AuditEvent = mongoose.model<IAuditEvent>('AuditEvent', auditEventSchema);
