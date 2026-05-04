"use client";

import { useCallback, useEffect, useState } from "react";
import type { Role } from "@/lib/db-enums";
import { roleLabel } from "@/lib/role-label";

type Row = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  active: boolean;
  createdAt: string;
};

const roles: Role[] = ["ADMIN", "OPERATOR", "VIEWER"];

export function UsersClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("OPERATOR");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = (await res.json()) as { items: Row[] };
    setRows(data.items);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/auth/me");
      const j = (await res.json()) as { user: { id: string } | null };
      setMeId(j.user?.id ?? null);
    })();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, displayName, role }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setErr(j?.error ?? "创建失败");
      return;
    }
    setMsg("已创建用户");
    setUsername("");
    setPassword("");
    setDisplayName("");
    setRole("OPERATOR");
    await load();
  }

  async function patchUser(id: string, body: Record<string, unknown>) {
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setErr(j?.error ?? "更新失败");
      return;
    }
    setMsg("已更新");
    await load();
  }

  async function deleteUser(id: string, usernameLabel: string) {
    if (!confirm(`确定删除用户「${usernameLabel}」？此操作不可恢复。`)) return;
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setErr(j?.error ?? "删除失败");
      return;
    }
    setMsg("已删除用户");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">用户与权限</h1>
        <p className="text-sm text-slate-500 mt-1">
          <span className="font-medium text-slate-700">管理员</span>：全权限；
          <span className="font-medium text-slate-700"> 仓管员</span>：可登记出入库；
          <span className="font-medium text-slate-700"> 只读</span>：仅查看库存/记录/报表。
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 max-w-2xl"
      >
        <div className="text-sm font-semibold text-slate-800">新建用户</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-600">
            用户名
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            初始密码（≥2位，支持中文）
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            显示名称
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            角色
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        {msg && <p className="text-sm text-emerald-700">{msg}</p>}
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700 min-h-[44px]"
        >
          创建
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">用户名</th>
              <th className="px-4 py-3">显示名称</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3 text-right min-w-[200px]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <UserRow
                key={r.id}
                row={r}
                meId={meId}
                onPatch={(b) => void patchUser(r.id, b)}
                onDelete={() => void deleteUser(r.id, r.username)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({
  row,
  meId,
  onPatch,
  onDelete,
}: {
  row: Row;
  meId: string | null;
  onPatch: (body: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [pwd, setPwd] = useState("");
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(row.displayName);
  const canDelete = meId && row.id !== meId;

  const handleDisplayNameSave = () => {
    if (editDisplayName.trim() === "") {
      setEditDisplayName(row.displayName);
      setEditingDisplayName(false);
      return;
    }
    if (editDisplayName !== row.displayName) {
      onPatch({ displayName: editDisplayName.trim() });
    }
    setEditingDisplayName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleDisplayNameSave();
    } else if (e.key === "Escape") {
      setEditDisplayName(row.displayName);
      setEditingDisplayName(false);
    }
  };

  return (
    <tr className="align-middle hover:bg-slate-50/60">
      <td className="px-4 py-3 font-mono text-xs">{row.username}</td>
      <td className="px-4 py-3">
        {editingDisplayName ? (
          <input
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm min-h-[40px] w-full"
            value={editDisplayName}
            onChange={(e) => setEditDisplayName(e.target.value)}
            onBlur={handleDisplayNameSave}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <div
            className="px-2 py-1.5 min-h-[40px] flex items-center cursor-pointer hover:bg-slate-50 rounded-md"
            onClick={() => setEditingDisplayName(true)}
          >
            {row.displayName}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <select
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm min-h-[40px] max-w-full"
          value={row.role}
          onChange={(e) => onPatch({ role: e.target.value as Role })}
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          className={`rounded-full px-2 py-1 text-xs ${
            row.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"
          }`}
          onClick={() => onPatch({ active: !row.active })}
        >
          {row.active ? "启用" : "禁用"}
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col sm:flex-row gap-2 justify-end items-stretch sm:items-center">
          <div className="flex gap-1 justify-end">
            <input
              type="password"
              placeholder="新密码"
              className="w-full sm:w-28 rounded-md border border-slate-300 px-2 py-1.5 text-xs min-h-[36px]"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
            <button
              type="button"
              className="rounded-md border border-slate-300 px-2 py-1.5 text-xs hover:bg-slate-50 whitespace-nowrap min-h-[36px]"
              onClick={() => {
                if (pwd.length < 2) {
                  alert("密码至少 2 个字符");
                  return;
                }
                onPatch({ password: pwd });
                setPwd("");
              }}
            >
              改密
            </button>
          </div>
          {canDelete && (
            <button
              type="button"
              className="rounded-md border border-rose-200 px-2 py-1.5 text-xs text-rose-700 hover:bg-rose-50 min-h-[36px]"
              onClick={onDelete}
            >
              删除
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
