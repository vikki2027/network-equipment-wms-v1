import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canEditDeviceTypes } from "@/lib/auth-context";

const createSchema = z.object({
  deviceTypeId: z.string().min(1),
  name: z.string().min(1).max(200),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!canEditDeviceTypes(user)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  try {
    const created = await prisma.deviceModel.create({
      data: {
        deviceTypeId: parsed.data.deviceTypeId,
        name: parsed.data.name.trim(),
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });
    await prisma.inventory.create({
      data: { deviceModelId: created.id, quantity: 0 },
    });
    return NextResponse.json({ id: created.id });
  } catch {
    return NextResponse.json(
      { error: "可能重复：同一大类下型号需唯一" },
      { status: 400 },
    );
  }
}
