import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { NextResponse as NextResponseImpl } from "next/server";
import { sessionPayloadFromUser } from "./auth-context";

export const SESSION_COOKIE = "wms_session";

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET 未配置或过短，请在 .env 中设置至少 16 位随机字符串");
  }
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  userId: string;
  role: string;
  username: string;
};

export async function createSessionToken(payload: SessionPayload) {
  return await new SignJWT({
    role: payload.role,
    username: payload.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.sub as string | undefined;
    const role = payload.role as string | undefined;
    const username = payload.username as string | undefined;
    if (!userId || !role || !username) return null;
    return { userId, role, username };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    ...cookieBase,
    maxAge: 60 * 60 * 24 * 1,
  });
}

export function applySessionToResponse(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    ...cookieBase,
    maxAge: 60 * 60 * 24 * 1,
  });
}

export function clearSessionOnResponse(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    ...cookieBase,
    maxAge: 0,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    ...cookieBase,
    maxAge: 0,
  });
}

export async function createAuthResponse(user: { id: string; username: string; displayName: string; role: string }) {
  const sessionToken = await createSessionToken(sessionPayloadFromUser(user));
  const res = NextResponseImpl.json({
    ok: true,
    user: { username: user.username, displayName: user.displayName, role: user.role },
  });
  applySessionToResponse(res, sessionToken);
  return res;
}
