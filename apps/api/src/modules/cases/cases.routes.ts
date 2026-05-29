import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CaseStatus } from '@ops-cases/shared';
import { Types } from 'mongoose';
import { Case } from '../../models/Case';
import { Client } from '../../models/Client';
import { authenticate } from '../../middleware/auth';
import { NotFoundError } from '../../lib/errors';
import { listAuditEventsForCase } from '../transitions/audit.repository';
import transitionRoutes from '../transitions/transition.routes';

const router = Router();

router.use(authenticate);

const documentSchema = z.object({
  filename: z.string().min(1).max(180),
  contentType: z.string().min(1).max(120),
  size: z.number().int().positive().max(1024 * 1024),
  data: z.string().min(1),
});

const createCaseSchema = z.object({
  clientName: z.string().min(1).max(120),
  clientCode: z.string().min(2).max(12),
  caseType: z.string().min(2).max(80),
  dueAt: z.string().datetime().optional(),
  documents: z.array(documentSchema).max(3).default([]),
});

function makeCaseNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CASE-${stamp}-${suffix}`;
}

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cases = await Case.find().sort({ updatedAt: -1 }).limit(100).lean();
    res.json({ cases });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createCaseSchema.parse(req.body);
    const clientCode = input.clientCode.trim().toUpperCase();
    const client = await Client.findOneAndUpdate(
      { code: clientCode },
      { $set: { name: input.clientName.trim(), code: clientCode } },
      { new: true, upsert: true },
    );

    const caseDoc = await Case.create({
      caseNumber: makeCaseNumber(),
      clientId: client._id,
      status: CaseStatus.Draft,
      caseType: input.caseType.trim(),
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      documents: input.documents.map((doc) => ({
        ...doc,
        uploadedAt: new Date(),
      })),
    });

    res.status(201).json({ case: caseDoc.toObject() });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseDoc = await Case.findById(req.params.id).lean();
    if (!caseDoc) {
      throw new NotFoundError('Case');
    }
    res.json({ case: caseDoc });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseDoc = await Case.findById(req.params.id);
    if (!caseDoc) {
      throw new NotFoundError('Case');
    }
    const events = await listAuditEventsForCase(new Types.ObjectId(req.params.id));
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

router.use('/:id/transitions', transitionRoutes);

export default router;
