import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatModelLabel } from "@/lib/model-label";

export async function GET() {
  const rows = await prisma.inventory.findMany({
    include: {
      deviceModel: {
        include: {
          deviceType: { select: { id: true, name: true, sortOrder: true } },
        },
      },
    },
    orderBy: [
      { deviceModel: { deviceType: { sortOrder: "asc" } } },
      { deviceModel: { sortOrder: "asc" } },
      { deviceModel: { name: "asc" } },
    ],
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      deviceModelId: r.deviceModelId,
      deviceTypeId: r.deviceModel.deviceType.id,
      deviceTypeName: r.deviceModel.deviceType.name,
      modelName: r.deviceModel.name,
      label: formatModelLabel(r.deviceModel),
      quantity: r.quantity,
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}
