import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createAuthResponse } from "@/lib/session";

const schema = z.object({
  token: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }

  const { token, username, password } = parsed.data;
  const s = await prisma.qrLoginSession.findUnique({ where: { token } });
  if (!s || s.expiresAt < new Date()) {
    return NextResponse.json({ error: "二维码已过期，请刷新电脑端页面重试" }, { status: 400 });
  }
  if (s.status !== "pending") {
    return NextResponse.json({ error: "该二维码已处理" }, { status: 400 });
  }

  const u = await prisma.user.findUnique({ where: { username } });
  if (!u || !u.active) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const ok = await verifyPassword(password, u.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  await prisma.qrLoginSession.update({
    where: { id: s.id },
    data: { status: "confirmed", userId: u.id },
  });

  return await createAuthResponse(u);
}
