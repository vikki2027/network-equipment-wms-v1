"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@/lib/db-enums";
import { roleLabel } from "@/lib/role-label";

type User = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
};

const nav: {
  href: string;
  label: string;
  short?: string;
  admin?: boolean;
  denyRoles?: Role[];
}[] = [
  { href: "/dashboard", label: "概览", short: "首页" },
  { href: "/dashboard/register", label: "入库 / 出库", short: "登记", denyRoles: ["VIEWER"] },
  { href: "/dashboard/inventory", label: "库存", short: "库存" },
  { href: "/dashboard/movements", label: "出入库记录", short: "记录" },
  { href: "/dashboard/reports", label: "报表", short: "报表" },
  { href: "/dashboard/device-types", label: "设备类型", short: "类型", admin: true },
  { href: "/dashboard/users", label: "用户与权限", short: "用户", admin: true },
];

export function DashboardShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const items = nav.filter((n) => {
    if (n.admin && user.role !== "ADMIN") return false;
    if (n.denyRoles?.includes(user.role)) return false;
    return true;
  });

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row">
      <aside className="md:w-56 shrink-0 bg-slate-900 text-slate-100 flex flex-col md:min-h-screen">
        <div className="p-4 border-b border-slate-800">
          <div className="text-sm font-semibold">网络设备仓储</div>
          <div className="text-xs text-slate-400 mt-1 truncate">
            {user.displayName} · {roleLabel(user.role)}
          </div>
        </div>
        {/* 桌面侧栏 */}
        <nav className="hidden md:flex flex-1 flex-col p-2 space-y-1">
           {items.map((item) => {
            const active = pathname === item.href;
            const isOverview = item.href === "/dashboard";
            const isInventory = item.href === "/dashboard/inventory";
            
            return (
              <Link
                key={item.href}
                href={isOverview || isInventory ? `${item.href}?refresh=${Date.now()}` : item.href}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {/* 移动端横向导航 */}
        <nav className="md:hidden flex overflow-x-auto gap-1 p-2 border-b border-slate-800 no-scrollbar">
           {items.map((item) => {
            const active = pathname === item.href;
            const isOverview = item.href === "/dashboard";
            const isInventory = item.href === "/dashboard/inventory";
            
            return (
              <Link
                key={item.href}
                href={isOverview || isInventory ? `${item.href}?refresh=${Date.now()}` : item.href}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs whitespace-nowrap transition-colors ${
                  active ? "bg-slate-800 text-white" : "text-slate-300 bg-slate-800/40"
                }`}
              >
                {item.short ?? item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800 mt-auto">
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full rounded-md bg-slate-800 px-3 py-2.5 text-sm hover:bg-slate-700 min-h-[44px]"
          >
            退出登录
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-6xl mx-auto p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
