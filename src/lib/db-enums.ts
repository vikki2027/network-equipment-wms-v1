/** SQLite 使用字符串存储，与 Prisma schema 中 role / type 字段一致 */

export const Role = {
  ADMIN: "ADMIN",
  OPERATOR: "OPERATOR",
  VIEWER: "VIEWER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const MovementType = {
  IN: "IN",
  OUT: "OUT",
} as const;
export type MovementType = (typeof MovementType)[keyof typeof MovementType];
