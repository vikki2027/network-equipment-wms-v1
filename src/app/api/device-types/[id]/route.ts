import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canEditDeviceTypes } from "@/lib/auth-context";

const patchSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!canEditDeviceTypes(user)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.sortOrder !== undefined) data.sortOrder = parsed.data.sortOrder;

  await prisma.deviceType.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!canEditDeviceTypes(user)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const { id } = await params;

  const movements = await prisma.stockMovement.count({
    where: { deviceModel: { deviceTypeId: id } },
  });
  if (movements > 0) {
    return NextResponse.json(
      { error: "该大类下已有出入库记录，无法删除（可先归档或联系管理员）" },
      { status: 400 },
    );
  }

  const models = await prisma.deviceModel.findMany({
    where: { deviceTypeId: id },
    include: { inventory: true },
  });
  for (const m of models) {
    if (m.inventory && m.inventory.quantity !== 0) {
      return NextResponse.json({ error: "存在非零库存的型号，无法删除该大类" }, { status: 400 });
    }
  }

  await prisma.deviceType.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
