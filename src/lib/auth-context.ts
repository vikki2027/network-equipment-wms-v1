import type { Role } from "./db-enums";
import { Role as R } from "./db-enums";
import { prisma } from "./prisma";
import { getSession, SessionPayload } from "./session";

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  active: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const s = await getSession();
  if (!s) return null;
  const u = await prisma.user.findUnique({ where: { id: s.userId } });
  if (!u || !u.active) return null;
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role as Role,
    active: u.active,
  };
}

export function canOperate(user: CurrentUser | null) {
  return user && (user.role === R.ADMIN || user.role === R.OPERATOR);
}

export function canManageUsers(user: CurrentUser | null) {
  return user?.role === R.ADMIN;
}

export function canEditDeviceTypes(user: CurrentUser | null) {
  return user?.role === R.ADMIN;
}

export function canViewReports(user: CurrentUser | null) {
  return !!user;
}

export function sessionPayloadFromUser(u: {
  id: string;
  username: string;
  role: string;
}): SessionPayload {
  return { userId: u.id, username: u.username, role: u.role };
}
