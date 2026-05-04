import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canEditDeviceTypes } from "@/lib/auth-context";
import { formatModelLabelFromParts } from "@/lib/model-label";

export async function GET() {
  const list = await prisma.deviceType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      models: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          inventory: { select: { quantity: true } },
        },
      },
    },
  });
  return NextResponse.json({
    items: list.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      sortOrder: d.sortOrder,
      models: d.models.map((m) => ({
        id: m.id,
        name: m.name,
        label: formatModelLabelFromParts(m.name),
        sortOrder: m.sortOrder,
        quantity: m.inventory?.quantity ?? 0,
      })),
    })),
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(500).optional().nullable(),
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

  const created = await prisma.deviceType.create({
    data: {
      name: parsed.data.name.trim(),
      description: parsed.data.description ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });

  return NextResponse.json({ id: created.id });
}
