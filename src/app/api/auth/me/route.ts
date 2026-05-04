import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-context";

export async function GET() {
  const u = await getCurrentUser();
  if (!u) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
    },
  });
}
