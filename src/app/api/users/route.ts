import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageUsers } from "@/lib/auth-context";
import { hashPassword } from "@/lib/password";

export async function GET() {
  const user = await getCurrentUser();
  if (!canManageUsers(user)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const list = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ items: list });
}

const createSchema = z.object({
  username: z.string().min(2).max(32),
  password: z.string().min(2).max(64),
  displayName: z.string().min(1).max(64),
  role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!canManageUsers(user)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误（用户名至少2位，密码至少2位）" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (exists) {
    return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const created = await prisma.user.create({
    data: {
      username: parsed.data.username.trim(),
      displayName: parsed.data.displayName.trim(),
      role: parsed.data.role,
      passwordHash,
    },
  });

  return NextResponse.json({ id: created.id });
}
