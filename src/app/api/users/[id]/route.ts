import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageUsers } from "@/lib/auth-context";
import { hashPassword } from "@/lib/password";

const patchSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(2).max(64).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!canManageUsers(me)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  if (me?.id === id && parsed.data.active === false) {
    return NextResponse.json({ error: "不能禁用当前登录账号" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.displayName !== undefined) data.displayName = parsed.data.displayName;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.password) {
    data.passwordHash = await hashPassword(parsed.data.password);
  }

  await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!canManageUsers(me)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const { id } = await params;

  if (me?.id === id) {
    return NextResponse.json({ error: "不能删除当前登录账号" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const opCount = await prisma.stockMovement.count({ where: { operatorId: id } });
  if (opCount > 0) {
    return NextResponse.json(
      { error: `该用户已有 ${opCount} 条出入库登记记录，无法删除（可先禁用账号）` },
      { status: 400 },
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
