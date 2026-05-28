import { Router, Request, Response, NextFunction } from 'express';
import { UserRole } from '@ops-cases/shared';
import { authenticate, requireRole } from '../../middleware/auth';
import { getManagerDashboard } from './dashboard.service';

const router = Router();

router.get(
  '/manager',
  authenticate,
  requireRole(UserRole.Manager),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getManagerDashboard();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
