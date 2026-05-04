import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { buildMovementWhereClause, MovementQueryFilters } from "@/lib/movement-query-builder";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-context";
import { nextDocumentNo } from "@/lib/document-no";
import type { MovementType } from "@/lib/db-enums";
import { Role } from "@/lib/db-enums";
import { formatModelLabel } from "@/lib/model-label";

const listSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  type: z.enum(["IN", "OUT", "ALL"]).optional(),
  deviceTypeId: z.string().optional(),
  deviceModelId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = listSchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const page = parsed.data.page ?? 1;
  const pageSize = parsed.data.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const filters: MovementQueryFilters = {
    deviceModelId: parsed.data.deviceModelId,
    deviceTypeId: parsed.data.deviceTypeId,
    from: parsed.data.from,
    to: parsed.data.to,
    type: parsed.data.type,
  };
  const where = buildMovementWhereClause(filters);

  const [total, rows] = await prisma.$transaction([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        deviceModel: {
          include: { deviceType: { select: { id: true, name: true } } },
        },
        operator: { select: { displayName: true, username: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    items: rows.map((m) => ({
      id: m.id,
      documentNo: m.documentNo,
      type: m.type,
      deviceTypeId: m.deviceModel.deviceType.id,
      deviceTypeName: m.deviceModel.deviceType.name,
      deviceModelId: m.deviceModelId,
      modelLabel: formatModelLabel(m.deviceModel),
      quantity: m.quantity,
      purpose: m.purpose,
      remark: m.remark,
      operatorName: m.operator.displayName,
      operatorUsername: m.operator.username,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

const createSchema = z.object({
  type: z.enum(["IN", "OUT"]),
  deviceModelId: z.string().min(1),
  quantity: z.number().int().positive().max(1_000_000),
  purpose: z.string().max(200).optional().nullable(),
  remark: z.string().max(500).optional().nullable(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (user.role === Role.VIEWER) {
    return NextResponse.json({ error: "只读用户不能登记出入库" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请检查数量与设备型号" }, { status: 400 });
  }

  const { type, deviceModelId, quantity, purpose, remark } = parsed.data;

  const docNo = await nextDocumentNo(type as MovementType);

  try {
    const movement = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({ where: { deviceModelId } });
      if (!inv) {
        throw new Error("设备型号不存在");
      }

      if (type === "OUT") {
        if (inv.quantity < quantity) {
          throw new Error(`库存不足，当前可用：${inv.quantity}`);
        }
        await tx.inventory.update({
          where: { deviceModelId },
          data: { quantity: { decrement: quantity } },
        });
      } else {
        await tx.inventory.update({
          where: { deviceModelId },
          data: { quantity: { increment: quantity } },
        });
      }

      return tx.stockMovement.create({
        data: {
          documentNo: docNo,
          type,
          deviceModelId,
          quantity,
          operatorId: user.id,
          purpose: purpose ?? null,
          remark: remark ?? null,
        },
      });
    });

    revalidateTag('dashboard');
    revalidateTag('inventory');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/inventory');
    
    return NextResponse.json({
      id: movement.id,
      documentNo: movement.documentNo,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "操作失败";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
