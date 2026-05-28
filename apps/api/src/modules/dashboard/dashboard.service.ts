import { CaseStatus } from '@ops-cases/shared';
import { Case } from '../../models/Case';
import { User } from '../../models/User';

const OPEN_STATUSES = { status: { $ne: CaseStatus.Closed } };

export async function getManagerDashboard() {
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    openCases,
    breachingSla,
    dueIn48Hours,
    byStatusRaw,
    agentWorkloadRaw,
    createdLast30,
    closedLast30,
  ] = await Promise.all([
    Case.countDocuments(OPEN_STATUSES),
    Case.countDocuments({
      ...OPEN_STATUSES,
      $or: [{ slaBreachedAt: { $ne: null } }, { dueAt: { $lt: now } }],
    }),
    Case.countDocuments({
      ...OPEN_STATUSES,
      dueAt: { $gte: now, $lte: in48h },
    }),
    Case.aggregate<{ _id: string; count: number }>([
      { $match: OPEN_STATUSES },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Case.aggregate<{ _id: unknown; openCount: number }>([
      { $match: { ...OPEN_STATUSES, assigneeId: { $ne: null } } },
      { $group: { _id: '$assigneeId', openCount: { $sum: 1 } } },
      { $sort: { openCount: -1 } },
      { $limit: 10 },
    ]),
    Case.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Case.countDocuments({ closedAt: { $gte: thirtyDaysAgo } }),
  ]);

  const assigneeIds = agentWorkloadRaw.map((r) => r._id);
  const users = await User.find({ _id: { $in: assigneeIds } })
    .select('name email')
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const casesByStatus = Object.values(CaseStatus)
    .filter((s) => s !== CaseStatus.Closed && s !== CaseStatus.Draft)
    .map((status) => ({
      status,
      count: byStatusRaw.find((r) => r._id === status)?.count ?? 0,
    }));

  const agentWorkload = agentWorkloadRaw.map((row) => {
    const id = String(row._id);
    const user = userMap.get(id);
    return {
      assigneeId: id,
      name: user?.name ?? 'Unknown',
      email: user?.email,
      openCount: row.openCount,
    };
  });

  const closureRate30d =
    createdLast30 > 0 ? Math.round((closedLast30 / createdLast30) * 1000) / 10 : 0;

  return {
    tiles: {
      openCases,
      breachingSla,
      dueIn48Hours,
      closureRate30d,
      createdLast30,
      closedLast30,
    },
    casesByStatus,
    agentWorkload,
    asOf: now.toISOString(),
  };
}
