import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CaseAction } from '@ops-cases/shared';
import { authenticate } from '../../middleware/auth';
import { transitionCase } from './transition.service';

const router = Router({ mergeParams: true });

const transitionBodySchema = z.object({
  action: z.nativeEnum(CaseAction),
  assigneeId: z.string().optional(),
});

router.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = transitionBodySchema.parse(req.body);
      const caseId = req.params.id;
      const result = await transitionCase(
        caseId,
        body.action,
        {
          userId: req.auth!.userId,
          role: req.auth!.role,
        },
        { assigneeId: body.assigneeId },
      );

      res.json({
        case: result.case.toJSON(),
        auditEvent: result.auditEvent.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
