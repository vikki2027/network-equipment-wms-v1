import type { MovementType } from "./db-enums";
import { prisma } from "./prisma";
import { format } from "date-fns";

const PREFIX: Record<MovementType, string> = {
  IN: "RK",
  OUT: "CK",
};

export async function nextDocumentNo(type: MovementType) {
  const day = format(new Date(), "yyyyMMdd");
  const prefix = `${PREFIX[type]}${day}`;
  const last = await prisma.stockMovement.findFirst({
    where: { documentNo: { startsWith: prefix } },
    orderBy: { documentNo: "desc" },
    select: { documentNo: true },
  });
  let seq = 1;
  if (last?.documentNo) {
    const tail = last.documentNo.slice(prefix.length);
    const n = parseInt(tail, 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}
