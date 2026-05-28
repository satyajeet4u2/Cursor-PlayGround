import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Case } from '../../models/Case';
import { authenticate } from '../../middleware/auth';
import { NotFoundError } from '../../lib/errors';
import { listAuditEventsForCase } from '../transitions/audit.repository';
import transitionRoutes from '../transitions/transition.routes';

const router = Router();

router.use(authenticate);

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cases = await Case.find().sort({ updatedAt: -1 }).limit(100).lean();
    res.json({ cases });
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
