import { CaseStatus, CaseVerdict } from '@ops-cases/shared';
import { Case } from '../../models/Case';
import { User } from '../../models/User';

export interface DateRange {
  from: Date;
  to: Date;
}

export function parseDateRange(query: {
  from?: string;
  to?: string;
}): DateRange {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
  return { from, to };
}

export async function getMonthlyClosureRate(range: DateRange) {
  const rows = await Case.aggregate<{
    _id: { year: number; month: number };
    created: number;
    closed: number;
  }>([
    {
      $match: {
        $or: [
          { createdAt: { $gte: range.from, $lte: range.to } },
          { closedAt: { $gte: range.from, $lte: range.to } },
        ],
      },
    },
    {
      $facet: {
        created: [
          { $match: { createdAt: { $gte: range.from, $lte: range.to } } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
        ],
        closed: [
          { $match: { closedAt: { $gte: range.from, $lte: range.to } } },
          {
            $group: {
              _id: {
                year: { $year: '$closedAt' },
                month: { $month: '$closedAt' },
              },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const created = rows[0]?.created ?? [];
  const closed = rows[0]?.closed ?? [];
  const monthKeys = new Set<string>();
  for (const r of created) monthKeys.add(`${r._id.year}-${r._id.month}`);
  for (const r of closed) monthKeys.add(`${r._id.year}-${r._id.month}`);

  return Array.from(monthKeys)
    .sort()
    .map((key) => {
      const [y, m] = key.split('-').map(Number);
      const c = created.find((r) => r._id.year === y && r._id.month === m)?.count ?? 0;
      const cl = closed.find((r) => r._id.year === y && r._id.month === m)?.count ?? 0;
      return {
        period: `${y}-${String(m).padStart(2, '0')}`,
        created: c,
        closed: cl,
        closureRatePct: c > 0 ? Math.round((cl / c) * 1000) / 10 : 0,
      };
    });
}

export async function getTurnaroundByCaseType(range: DateRange) {
  const rows = await Case.aggregate<{
    _id: string;
    count: number;
    avgDays: number;
  }>([
    {
      $match: {
        status: CaseStatus.Closed,
        closedAt: { $gte: range.from, $lte: range.to },
        createdAt: { $exists: true },
      },
    },
    {
      $project: {
        caseType: 1,
        days: {
          $divide: [{ $subtract: ['$closedAt', '$createdAt'] }, 1000 * 60 * 60 * 24],
        },
      },
    },
    {
      $group: {
        _id: '$caseType',
        count: { $sum: 1 },
        avgDays: { $avg: '$days' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return rows.map((r) => ({
    caseType: r._id,
    count: r.count,
    avgDays: Math.round(r.avgDays * 10) / 10,
    medianDays: Math.round(r.avgDays * 10) / 10,
  }));
}

export async function getAgentProductivity(range: DateRange) {
  const rows = await Case.aggregate<{
    _id: unknown;
    closedCount: number;
    avgDaysToClose: number;
    openAtEnd: number;
  }>([
    {
      $match: {
        assigneeId: { $ne: null },
        $or: [
          { closedAt: { $gte: range.from, $lte: range.to } },
          { status: { $ne: CaseStatus.Closed }, updatedAt: { $lte: range.to } },
        ],
      },
    },
    {
      $group: {
        _id: '$assigneeId',
        closedCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', CaseStatus.Closed] },
                  { $gte: ['$closedAt', range.from] },
                  { $lte: ['$closedAt', range.to] },
                ],
              },
              1,
              0,
            ],
          },
        },
        avgDaysToClose: {
          $avg: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', CaseStatus.Closed] },
                  { $gte: ['$closedAt', range.from] },
                ],
              },
              {
                $divide: [
                  { $subtract: ['$closedAt', '$createdAt'] },
                  1000 * 60 * 60 * 24,
                ],
              },
              null,
            ],
          },
        },
        openAtEnd: {
          $sum: {
            $cond: [{ $ne: ['$status', CaseStatus.Closed] }, 1, 0],
          },
        },
      },
    },
    { $sort: { closedCount: -1 } },
  ]);

  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } })
    .select('name email')
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return rows.map((r) => {
    const id = String(r._id);
    const user = userMap.get(id);
    return {
      assigneeId: id,
      name: user?.name ?? 'Unknown',
      email: user?.email,
      closedCount: r.closedCount,
      avgDaysToClose: Math.round((r.avgDaysToClose ?? 0) * 10) / 10,
      openAtEnd: r.openAtEnd,
    };
  });
}

export async function getDiscrepancyRate(range: DateRange) {
  const rows = await Case.aggregate<{
    _id: string | null;
    total: number;
    discrepant: number;
  }>([
    {
      $match: {
        status: CaseStatus.Closed,
        closedAt: { $gte: range.from, $lte: range.to },
      },
    },
    {
      $group: {
        _id: '$caseType',
        total: { $sum: 1 },
        discrepant: {
          $sum: {
            $cond: [{ $eq: ['$verdict', CaseVerdict.Discrepant] }, 1, 0],
          },
        },
      },
    },
    { $sort: { total: -1 } },
  ]);

  return rows.map((r) => ({
    caseType: r._id ?? 'unknown',
    totalClosed: r.total,
    discrepantCount: r.discrepant,
    discrepancyRatePct:
      r.total > 0 ? Math.round((r.discrepant / r.total) * 1000) / 10 : 0,
  }));
}

export function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}
