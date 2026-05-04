import type { Prisma } from "@prisma/client/edge";

export interface MovementQueryFilters {
  deviceModelId?: string;
  deviceTypeId?: string;
  from?: string;
  to?: string;
  type?: "IN" | "OUT" | "ALL";
}

export function buildMovementWhereClause(
  filters: MovementQueryFilters
): Prisma.StockMovementWhereInput {
  const where: Prisma.StockMovementWhereInput = {};

  // 设备型号筛选
  if (filters.deviceModelId) {
    where.deviceModelId = filters.deviceModelId;
  } else if (filters.deviceTypeId) {
    where.deviceModel = { deviceTypeId: filters.deviceTypeId };
  }

  // 日期范围筛选
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) {
      where.createdAt.gte = new Date(filters.from);
    }
    if (filters.to) {
      const t = new Date(filters.to);
      t.setHours(23, 59, 59, 999);
      where.createdAt.lte = t;
    }
  }

  // 出入库类型筛选（仅用于列表查询）
  if (filters.type && filters.type !== "ALL") {
    where.type = filters.type;
  }

  return where;
}
