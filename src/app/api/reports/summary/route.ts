import { NextResponse } from "next/server";
import { MovementType } from "@/lib/db-enums";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formatModelLabel } from "@/lib/model-label";
import { buildMovementWhereClause, MovementQueryFilters } from "@/lib/movement-query-builder";

const schema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  deviceTypeId: z.string().optional(),
  deviceModelId: z.string().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const filters: MovementQueryFilters = {
    deviceModelId: parsed.data.deviceModelId,
    deviceTypeId: parsed.data.deviceTypeId,
    from: parsed.data.from,
    to: parsed.data.to,
  };
  const where = buildMovementWhereClause(filters);

  const movements = await prisma.stockMovement.findMany({
    where,
    select: {
      type: true,
      quantity: true,
      deviceModelId: true,
      deviceModel: {
        select: {
          id: true,
          name: true,
          
          deviceTypeId: true,
          deviceType: { select: { id: true, name: true } },
        },
      },
    },
  });

  let totalIn = 0;
  let totalOut = 0;
  const byType: Record<string, { in: number; out: number }> = {};
  const byModel: Record<string, { in: number; out: number; meta: { label: string; typeName: string } }> = {};

  for (const m of movements) {
    const qty = m.quantity;
    const dtId = m.deviceModel.deviceType.id;
    const dmId = m.deviceModel.id;
    const label = formatModelLabel(m.deviceModel);
    const typeName = m.deviceModel.deviceType.name;

    if (m.type === MovementType.IN) {
      totalIn += qty;
    } else {
      totalOut += qty;
    }

    if (!byType[dtId]) byType[dtId] = { in: 0, out: 0 };
    if (m.type === MovementType.IN) byType[dtId].in += qty;
    else byType[dtId].out += qty;

    if (!byModel[dmId]) {
      byModel[dmId] = { in: 0, out: 0, meta: { label, typeName } };
    }
    if (m.type === MovementType.IN) byModel[dmId].in += qty;
    else byModel[dmId].out += qty;
  }

  const types = await prisma.deviceType.findMany({
    orderBy: [{ sortOrder: "asc" }],
    select: { id: true, name: true },
  });

  const byTypeRows = types.map((t: { id: string; name: string }) => ({
    deviceTypeId: t.id,
    name: t.name,
    in: byType[t.id]?.in ?? 0,
    out: byType[t.id]?.out ?? 0,
    net: (byType[t.id]?.in ?? 0) - (byType[t.id]?.out ?? 0),
  }));

  const byModelRows = Object.entries(byModel).map(([deviceModelId, v]) => ({
    deviceModelId,
    deviceTypeName: v.meta.typeName,
    modelLabel: v.meta.label,
    in: v.in,
    out: v.out,
    net: v.in - v.out,
  }));

  const inventory = await prisma.inventory.findMany({
    include: {
      deviceModel: {
        include: { deviceType: { select: { name: true, sortOrder: true } } },
      },
    },
    orderBy: [
      { deviceModel: { deviceType: { sortOrder: "asc" } } },
      { deviceModel: { sortOrder: "asc" } },
    ],
  });

  return NextResponse.json({
    range: {
      from: parsed.data.from ?? null,
      to: parsed.data.to ?? null,
    },
    totals: {
      in: totalIn,
      out: totalOut,
      net: totalIn - totalOut,
      records: movements.length,
    },
    byType: byTypeRows,
    byModel: byModelRows,
    inventorySnapshot: inventory.map((i: { deviceModelId: string; deviceModel: { deviceType: { name: string }; name: string }; quantity: number }) => ({
      deviceModelId: i.deviceModelId,
      deviceTypeName: i.deviceModel.deviceType.name,
      modelLabel: formatModelLabel(i.deviceModel),
      quantity: i.quantity,
    })),
  });
}
