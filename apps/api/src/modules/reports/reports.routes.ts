import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@ops-cases/shared';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  getAgentProductivity,
  getDiscrepancyRate,
  getMonthlyClosureRate,
  getTurnaroundByCaseType,
  parseDateRange,
  rowsToCsv,
} from './reports.service';

const router = Router();

const rangeQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

router.use(authenticate, requireRole(UserRole.Manager));

router.get('/closure-rate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const range = parseDateRange(rangeQuery.parse(req.query));
    res.json({ range, rows: await getMonthlyClosureRate(range) });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/turnaround-by-type',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = parseDateRange(rangeQuery.parse(req.query));
      res.json({ range, rows: await getTurnaroundByCaseType(range) });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/agent-productivity',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = parseDateRange(rangeQuery.parse(req.query));
      res.json({ range, rows: await getAgentProductivity(range) });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/discrepancy-rate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = parseDateRange(rangeQuery.parse(req.query));
      res.json({ range, rows: await getDiscrepancyRate(range) });
    } catch (err) {
      next(err);
    }
  },
);

const exportParams = z.object({
  type: z.enum([
    'closure-rate',
    'turnaround-by-type',
    'agent-productivity',
    'discrepancy-rate',
  ]),
  from: z.string().optional(),
  to: z.string().optional(),
});

router.get('/export.csv', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, from, to } = exportParams.parse(req.query);
    const range = parseDateRange({ from, to });

    let csv = '';
    let filename = 'report.csv';

    switch (type) {
      case 'closure-rate': {
        const rows = await getMonthlyClosureRate(range);
        csv = rowsToCsv(
          ['period', 'created', 'closed', 'closureRatePct'],
          rows as unknown as Record<string, unknown>[],
        );
        filename = 'closure-rate.csv';
        break;
      }
      case 'turnaround-by-type': {
        const rows = await getTurnaroundByCaseType(range);
        csv = rowsToCsv(
          ['caseType', 'count', 'avgDays', 'medianDays'],
          rows as unknown as Record<string, unknown>[],
        );
        filename = 'turnaround-by-type.csv';
        break;
      }
      case 'agent-productivity': {
        const rows = await getAgentProductivity(range);
        csv = rowsToCsv(
          ['name', 'email', 'closedCount', 'avgDaysToClose', 'openAtEnd'],
          rows as unknown as Record<string, unknown>[],
        );
        filename = 'agent-productivity.csv';
        break;
      }
      case 'discrepancy-rate': {
        const rows = await getDiscrepancyRate(range);
        csv = rowsToCsv(
          ['caseType', 'totalClosed', 'discrepantCount', 'discrepancyRatePct'],
          rows as unknown as Record<string, unknown>[],
        );
        filename = 'discrepancy-rate.csv';
        break;
      }
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
