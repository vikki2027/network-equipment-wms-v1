import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    return null;
  }
  return new TextEncoder().encode(s);
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const secret = getSecret();
  const token = request.cookies.get("wms_session")?.value;

  if (!secret || !token) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "未登录或会话无效" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "未登录或会话无效" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
