import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildMovementWhereClause, MovementQueryFilters } from "@/lib/movement-query-builder";

const schema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  deviceTypeId: z.string().optional(),
  deviceModelId: z.string().optional(),
});

function csvEscape(s: string) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

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

  const rows = await prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      deviceModel: {
        include: { deviceType: { select: { name: true } } },
      },
      operator: { select: { username: true, displayName: true } },
    },
  });

  const header = [
    "登记时间",
    "单号",
    "类型",
    "设备大类",
    "型号",
    "数量",
    "操作者账号",
    "操作者姓名",
    "用途/去向",
    "备注",
  ];

  const lines: string[] = [header.map(csvEscape).join(",")];

  for (const m of rows) {
    const typeLabel = m.type === "IN" ? "入库" : "出库";
    const modelName = m.deviceModel.name;
    const timeStr = m.createdAt.toLocaleString("zh-CN", { hour12: false });
    lines.push(
      [
        timeStr,
        m.documentNo,
        typeLabel,
        m.deviceModel.deviceType.name,
        modelName,
        String(m.quantity),
        m.operator.username,
        m.operator.displayName,
        m.purpose ?? "",
        m.remark ?? "",
      ]
        .map((c) => csvEscape(String(c)))
        .join(","),
    );
  }

  const body = "\ufeff" + lines.join("\n");
  const filename = `出入库明细_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
