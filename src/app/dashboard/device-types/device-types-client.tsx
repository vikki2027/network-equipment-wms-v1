"use client";

import { useCallback, useEffect, useState } from "react";

type ModelRow = {
  id: string;
  name: string;
  label: string;
  sortOrder: number;
  quantity: number;
};

type CatRow = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  models: ModelRow[];
};

export function DeviceTypesClient() {
  const [rows, setRows] = useState<CatRow[]>([]);
  const [catName, setCatName] = useState("");
  const [catSort, setCatSort] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [addCatId, setAddCatId] = useState("");
  const [modelName, setModelName] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/device-types");
    const data = (await res.json()) as { items: CatRow[] };
    setRows(data.items);
    setAddCatId((prev) => prev || data.items[0]?.id || "");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/device-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName, sortOrder: catSort }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setErr(j?.error ?? "创建失败");
      return;
    }
    setMsg("已新增大类");
    setCatName("");
    await load();
  }

  async function onCreateModel(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/device-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceTypeId: addCatId,
        name: modelName,
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setErr(j?.error ?? "创建失败");
      return;
    }
    setMsg("已新增型号");
    setModelName("");
    await load();
  }

  async function updateCategory(id: string, patch: Partial<Pick<CatRow, "name" | "sortOrder">>) {
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/device-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setErr(j?.error ?? "更新失败");
      return;
    }
    setMsg("已保存");
    await load();
  }

  async function removeCategory(id: string) {
    if (!confirm("确定删除该大类？需无库存且无历史单据。")) return;
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/device-types/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setErr(j?.error ?? "删除失败");
      return;
    }
    setMsg("已删除");
    await load();
  }

  async function updateModel(id: string, patch: { name?: string; sortOrder?: number }) {
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/device-models/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setErr(j?.error ?? "更新失败");
      return;
    }
    setMsg("已保存");
    await load();
  }

  async function removeModel(id: string) {
    if (!confirm("确定删除该型号？")) return;
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/device-models/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setErr(j?.error ?? "删除失败");
      return;
    }
    setMsg("已删除");
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">设备类型</h1>
        <p className="text-sm text-slate-500 mt-1">
           一级为设备大类，二级为型号。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={onCreateCategory}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
        >
          <div className="text-sm font-semibold text-slate-800">新增大类</div>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
            placeholder="名称"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            required
          />
          <input
            type="number"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm tabular-nums"
            placeholder="排序"
            value={catSort}
            onChange={(e) => setCatSort(Number(e.target.value))}
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700 w-full sm:w-auto"
          >
            添加大类
          </button>
        </form>

        <form
          onSubmit={onCreateModel}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
        >
          <div className="text-sm font-semibold text-slate-800">新增型号</div>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
            value={addCatId}
            onChange={(e) => setAddCatId(e.target.value)}
          >
            {rows.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
            placeholder="型号名称"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            required
          />

          <button
            type="submit"
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800 w-full sm:w-auto"
          >
            添加型号
          </button>
        </form>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}

      <div className="space-y-4">
        {rows.map((cat) => (
          <div
            key={cat.id}
            className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50 border-b border-slate-100">
              <CategoryHead
                cat={cat}
                onSave={(name, sortOrder) => void updateCategory(cat.id, { name, sortOrder })}
                onDelete={() => void removeCategory(cat.id)}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white text-left text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-2">展示名</th>
                    <th className="px-4 py-2">库存</th>
                    <th className="px-4 py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cat.models.map((m) => (
                    <ModelRowEditor
                      key={m.id}
                      row={m}
                      onSave={(patch) => void updateModel(m.id, patch)}
                      onDelete={() => void removeModel(m.id)}
                    />
                  ))}
                  {cat.models.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-500 text-sm">
                        暂无型号
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryHead({
  cat,
  onSave,
  onDelete,
}: {
  cat: CatRow;
  onSave: (name: string, sortOrder: number) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(cat.name);
  const [sortOrder, setSortOrder] = useState(cat.sortOrder);
  return (
    <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:items-center w-full">
      <input
        className="flex-1 rounded-md border border-slate-300 px-2 py-2 text-sm font-medium min-h-[40px]"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="number"
        className="w-full sm:w-24 rounded-md border border-slate-300 px-2 py-2 text-sm tabular-nums min-h-[40px]"
        value={sortOrder}
        onChange={(e) => setSortOrder(Number(e.target.value))}
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 sm:flex-none rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-white min-h-[40px]"
          onClick={() => onSave(name, sortOrder)}
        >
          保存大类
        </button>
        <button
          type="button"
          className="flex-1 sm:flex-none rounded-md border border-rose-200 px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 min-h-[40px]"
          onClick={onDelete}
        >
          删除大类
        </button>
      </div>
    </div>
  );
}

function ModelRowEditor({
  row,
  onSave,
  onDelete,
}: {
  row: ModelRow;
  onSave: (patch: { name?: string; sortOrder?: number }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(row.name);
  const [sortOrder, setSortOrder] = useState(row.sortOrder);

  return (
    <tr className="align-middle hover:bg-slate-50/60">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900">{row.label}</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            title="型号名"
          />
          <input
            type="number"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs tabular-nums"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </div>
      </td>
      <td className="px-4 py-3 tabular-nums text-slate-700">{row.quantity}</td>
      <td className="px-4 py-3 text-right space-x-2">
        <button
          type="button"
          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
          onClick={() => onSave({ name, sortOrder })}
        >
          保存
        </button>
        <button
          type="button"
          className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700"
          onClick={onDelete}
        >
          删除
        </button>
      </td>
    </tr>
  );
}
