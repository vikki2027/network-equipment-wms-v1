import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatModelLabel } from "@/lib/model-label";
import { unstable_cache } from 'next/cache';
import DashboardRefreshWrapper from "@/components/dashboard-refresh-wrapper";

export const revalidate = 0;

const getDashboardData = unstable_cache(
  async () => {
    const [invAgg, movement24h, lowStock] = await Promise.all([
      prisma.inventory.aggregate({ _sum: { quantity: true } }),
      prisma.stockMovement.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      prisma.inventory.findMany({
        where: { quantity: { lte: 5 } },
        include: {
          deviceModel: {
            include: { deviceType: { select: { name: true } } },
          },
        },
        orderBy: { quantity: "asc" },
        take: 8,
      }),
    ]);
    return { invAgg, movement24h, lowStock };
  },
  ['dashboard-data'],
  { tags: ['dashboard', 'inventory'] }
);

export default async function DashboardHome() {
  const { invAgg, movement24h, lowStock } = await getDashboardData();

  const totalQty = invAgg._sum.quantity ?? 0;

  return (
    <DashboardRefreshWrapper>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">概览</h1>
          <p className="text-sm text-slate-500 mt-1">
            快速查看库存总量、近期活动与低库存提醒。
          </p>
        </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">库存总台数</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{totalQty}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">近 24 小时单据数</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{movement24h}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
          <div className="text-xs text-slate-500">常用操作</div>
          <Link
            href="/dashboard/register"
            className="mt-3 inline-flex justify-center rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            登记入库 / 出库
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">低库存提醒（≤5）</h2>
          <Link href="/dashboard/inventory" className="text-sm text-brand-600 hover:underline">
            查看库存
          </Link>
        </div>
        {lowStock.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">当前没有低库存型号。</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {lowStock.map((row) => (
              <li key={row.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 text-sm">
                <span className="text-slate-700">
                  <span className="text-slate-500">{row.deviceModel.deviceType.name}</span>
                  {" · "}
                  <span className="font-medium">{formatModelLabel(row.deviceModel)}</span>
                </span>
                <span className="tabular-nums text-amber-700 font-medium">{row.quantity}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
    </DashboardRefreshWrapper>
  );
}
