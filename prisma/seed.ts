

import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

/** 一级分类 */
const CATEGORIES: { name: string; sortOrder: number }[] = [
  { name: "机顶盒", sortOrder: 10 },
  { name: "ONU", sortOrder: 20 },
  { name: "分光器", sortOrder: 30 },
  { name: "交换机", sortOrder: 40 },
  { name: "收发器", sortOrder: 50 },
  { name: "模块", sortOrder: 60 },
];

/** 二级型号 */
const MODELS_BY_CATEGORY: Record<string, string[]> = {
  机顶盒: ["九联2100KC 不配卡", "九联2100S1", "九联2100S1 不配卡"],
  ONU: [
    "华三 ET354",
    "华三ET254-G-S",
    "华为 EG8040C",
    "瑞斯康达RC5104-EA",
    "瑞斯康达RC5104G-AC",
    "瑞斯康达RC HT803",
    "瑞斯康达RC5104G-GP",
  ],
  分光器: ["1/2", "1/4", "1/7", "1/8", "1/16", "1/32"],
  交换机: ["华三24口千兆交换机", "迈普24口千兆交换机"],
  收发器: ["摩泰千兆收发器", "瑞斯康达RC001-1AC"],
  模块: ["瑞斯康达百兆模块（152/112-FE）", "瑞斯康达千兆模块"],
};

async function ensureModelInventory(
  deviceTypeId: string,
  name: string,
  sortOrder: number,
) {
  const dm = await prisma.deviceModel.upsert({
    where: {
      deviceTypeId_name: {
        deviceTypeId,
        name,
      },
    },
    update: { sortOrder },
    create: {
      deviceTypeId,
      name,
      sortOrder,
    },
  });
  await prisma.inventory.upsert({
    where: { deviceModelId: dm.id },
    update: {},
    create: { deviceModelId: dm.id, quantity: 0 },
  });
}

async function main() {
  const adminPass = await bcrypt.hash("admin123", 10);
  const opPass = await bcrypt.hash("operator123", 10);
  const userPass = await bcrypt.hash("user123", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPass,
      displayName: "系统管理员",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { username: "operator" },
    update: {},
    create: {
      username: "operator",
      passwordHash: opPass,
      displayName: "仓管员",
      role: "OPERATOR",
    },
  });

  await prisma.user.upsert({
    where: { username: "user" },
    update: { passwordHash: userPass, displayName: "普通用户", role: "OPERATOR" },
    create: {
      username: "user",
      passwordHash: userPass,
      displayName: "普通用户",
      role: "OPERATOR",
    },
  });

  await prisma.user.deleteMany({ where: { username: "viewer" } });

  for (const c of CATEGORIES) {
    const dt = await prisma.deviceType.upsert({
      where: { name: c.name },
      update: { sortOrder: c.sortOrder },
      create: { name: c.name, sortOrder: c.sortOrder },
    });

    const names = MODELS_BY_CATEGORY[c.name] ?? [];
    let idx = 0;
    for (const name of names) {
      idx += 1;
      await ensureModelInventory(dt.id, name, idx * 10);
    }
  }

  console.log(
    "Seed OK. 账号: admin/admin123, operator/operator123, user/user123（均为仓管级可操作出入库）",
  );
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
