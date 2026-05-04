import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createAuthResponse } from "@/lib/session";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 });
  }

  const u = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (!u || !u.active) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const ok = await verifyPassword(parsed.data.password, u.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  return await createAuthResponse(u);
}
