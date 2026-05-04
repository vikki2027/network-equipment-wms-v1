import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canEditDeviceTypes } from "@/lib/auth-context";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
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
  if (parsed.data.sortOrder !== undefined) data.sortOrder = parsed.data.sortOrder;

  try {
    await prisma.deviceModel.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "更新失败（名称冲突？）" }, { status: 400 });
  }
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

  const inv = await prisma.inventory.findUnique({ where: { deviceModelId: id } });
  if (inv && inv.quantity !== 0) {
    return NextResponse.json({ error: "库存不为 0，无法删除该型号" }, { status: 400 });
  }

  const cnt = await prisma.stockMovement.count({ where: { deviceModelId: id } });
  if (cnt > 0) {
    return NextResponse.json({ error: "已有出入库记录，无法删除该型号" }, { status: 400 });
  }

  await prisma.deviceModel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
