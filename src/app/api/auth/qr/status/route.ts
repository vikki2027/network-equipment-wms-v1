import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuthResponse } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "缺少 token" }, { status: 400 });
  }

  const s = await prisma.qrLoginSession.findUnique({ where: { token } });
  if (!s || s.expiresAt < new Date()) {
    return NextResponse.json({ status: "expired" });
  }

  if (s.status === "pending") {
    return NextResponse.json({ status: "pending" });
  }

  if (s.status === "confirmed" && s.userId) {
    const u = await prisma.user.findUnique({ where: { id: s.userId } });
    if (!u || !u.active) {
      await prisma.qrLoginSession.deleteMany({ where: { token } });
      return NextResponse.json({ status: "expired" });
    }

    await prisma.qrLoginSession.delete({ where: { id: s.id } });

    return await createAuthResponse(u);
  }

  return NextResponse.json({ status: "expired" });
}
