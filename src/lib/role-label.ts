import type { Role } from "./db-enums";
import { Role as R } from "./db-enums";

export function roleLabel(r: Role) {
  switch (r) {
    case R.ADMIN:
      return "管理员";
    case R.OPERATOR:
      return "仓管员";
    case R.VIEWER:
      return "只读";
    default:
      return r;
  }
}
