import { prisma } from "@/lib/prisma";
import { formatModelLabel } from "@/lib/model-label";
import { formatDateTime } from "@/lib/date-utils";
import { unstable_cache } from 'next/cache';
import InventoryRefreshWrapper from "@/components/inventory-refresh-wrapper";

export const revalidate = 0;

const getInventoryData = unstable_cache(
  async () => {
    // 获取所有库存记录
    const inventoryItems = await prisma.inventory.findMany({
      include: {
        deviceModel: {
          include: { deviceType: true },
        },
      },
      orderBy: [
        { deviceModel: { deviceType: { sortOrder: "asc" } } },
        { deviceModel: { sortOrder: "asc" } },
      ],
    });

    // 获取每个设备型号的最新出入库时间
    const latestMovements = await prisma.stockMovement.groupBy({
      by: ['deviceModelId'],
      _max: {
        createdAt: true,
      },
      where: {
        deviceModelId: {
          in: inventoryItems.map(item => item.deviceModelId),
        },
      },
    });

    // 创建映射：deviceModelId -> 最新出入库时间
    const latestMovementMap = new Map(
      latestMovements.map(m => [m.deviceModelId, m._max.createdAt])
    );

    // 合并数据
    return inventoryItems.map(item => ({
      ...item,
      latestMovementAt: latestMovementMap.get(item.deviceModelId) || item.updatedAt,
    }));
  },
  ['inventory-data'],
  { 
    tags: ['inventory', 'dashboard'],
    revalidate: 10 // 10秒后自动重新验证
  }
);

export default async function InventoryPage() {
  const rows = await getInventoryData();

  return (
    <InventoryRefreshWrapper>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">库存</h1>
          <p className="text-sm text-slate-500 mt-1">
            按「设备大类 → 型号」汇总的当前库存。
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">设备大类</th>
                <th className="px-4 py-3">型号 / 规格</th>
                <th className="px-4 py-3 text-right">数量</th>
                <th className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">最近出入库</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {r.deviceModel.deviceType.name}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {formatModelLabel(r.deviceModel)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.quantity}</td>
                  <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                    {formatDateTime(r.latestMovementAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </InventoryRefreshWrapper>
  );
}
