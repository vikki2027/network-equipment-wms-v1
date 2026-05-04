"use client";

import { useEffect, useMemo, useState } from "react";

type ModelRow = {
  id: string;
  name: string;
  label: string;
  quantity: number;
};

type CategoryRow = {
  id: string;
  name: string;
  models: ModelRow[];
};

export function RegisterForm() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [deviceModelId, setDeviceModelId] = useState("");
  const [kind, setKind] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState<number>(1);
  const [purpose, setPurpose] = useState("");
  const [remark, setRemark] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const models = useMemo(() => {
    const c = categories.find((x) => x.id === categoryId);
    return c?.models ?? [];
  }, [categories, categoryId]);

  async function refreshTree() {
    const res = await fetch("/api/device-types");
    const data = (await res.json()) as { items: CategoryRow[] };
    setCategories(data.items);
    if (!categoryId && data.items[0]) {
      setCategoryId(data.items[0].id);
      const firstModel = data.items[0].models[0];
      if (firstModel) setDeviceModelId(firstModel.id);
    }
  }

  useEffect(() => {
    void refreshTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c = categories.find((x) => x.id === categoryId);
    if (!c?.models.length) {
      setDeviceModelId("");
      return;
    }
    const still = c.models.some((m) => m.id === deviceModelId);
    if (!still) {
      setDeviceModelId(c.models[0].id);
    }
  }, [categoryId, categories, deviceModelId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: kind,
        deviceModelId,
        quantity,
        purpose: purpose || null,
        remark: remark || null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setErr(j?.error ?? "保存失败");
      return;
    }
    const data = (await res.json()) as { documentNo: string };
    setMsg(`已生成单据：${data.documentNo}`);
    setPurpose("");
    setRemark("");
    await refreshTree();
  }

  const selected = models.find((m) => m.id === deviceModelId);

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">入库 / 出库登记</h1>
        <p className="text-sm text-slate-500 mt-1">
          先选设备大类，再选具体型号。
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
      >
        <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
          <button
            type="button"
            className={`flex-1 rounded-md py-2 transition-shadow ${kind === "IN" ? "bg-white shadow-sm" : ""}`}
            onClick={() => setKind("IN")}
          >
            入库
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-2 transition-shadow ${kind === "OUT" ? "bg-white shadow-sm" : ""}`}
            onClick={() => setKind("OUT")}
          >
            出库
          </button>
        </div>

        <label className="block text-xs font-medium text-slate-600">
          设备大类
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-slate-600">
          型号 / 规格
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
            value={deviceModelId}
            onChange={(e) => setDeviceModelId(e.target.value)}
            disabled={!models.length}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}（当前库存 {m.quantity}）
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-slate-600">
          数量
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm tabular-nums min-h-[44px]"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>

        {kind === "OUT" && selected && (
          <p className="text-xs text-slate-500">
            提示：本次出库后预计剩余{" "}
            <span className="font-semibold text-slate-800">
              {Math.max(0, selected.quantity - quantity)}
            </span>
            （若不足将拒绝出库）
          </p>
        )}

        <label className="block text-xs font-medium text-slate-600">
          用途 / 去向（可选）
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="例如：装机出库、返修入库、项目调拨"
          />
        </label>

        <label className="block text-xs font-medium text-slate-600">
          备注（可选）
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[88px]"
            rows={3}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </label>

        {err && <p className="text-sm text-red-600">{err}</p>}
        {msg && <p className="text-sm text-emerald-700">{msg}</p>}

        <button
          type="submit"
          disabled={loading || !deviceModelId}
          className="w-full rounded-lg bg-brand-600 px-3 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 min-h-[48px] transition-colors active:scale-[0.99]"
        >
          {loading ? "提交中…" : "提交单据"}
        </button>
      </form>
    </div>
  );
}
