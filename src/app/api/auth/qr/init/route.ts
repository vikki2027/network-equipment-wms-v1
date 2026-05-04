import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.qrLoginSession.create({
    data: { token, status: "pending", expiresAt },
  });
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${base.replace(/\/$/, "")}/auth/qr-login?token=${encodeURIComponent(token)}`;
  const qrDataUrl = await QRCode.toDataURL(url, { width: 280, margin: 1 });
  return NextResponse.json({ token, qrDataUrl, expiresAt: expiresAt.toISOString() });
}
