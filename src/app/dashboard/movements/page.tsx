"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  documentNo: string;
  type: "IN" | "OUT";
  deviceTypeName: string;
  modelLabel: string;
  quantity: number;
  purpose: string | null;
  remark: string | null;
  operatorName: string;
  operatorUsername: string;
  createdAt: string;
};

type Category = {
  id: string;
  name: string;
  models: { id: string; label: string }[];
};

export default function MovementsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [categories, setCategories] = useState<Category[]>([]);

  const [type, setType] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [deviceTypeId, setDeviceTypeId] = useState("");
  const [deviceModelId, setDeviceModelId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  const models = useMemo(() => {
    const c = categories.find((x) => x.id === deviceTypeId);
    return c?.models ?? [];
  }, [categories, deviceTypeId]);

  const loadTypes = useCallback(async () => {
    const res = await fetch("/api/device-types");
    const data = (await res.json()) as {
      items: {
        id: string;
        name: string;
        models: { id: string; label: string }[];
      }[];
    };
    setCategories(
      data.items.map((t) => ({
        id: t.id,
        name: t.name,
        models: t.models.map((m) => ({ id: m.id, label: m.label })),
      })),
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (type !== "ALL") params.set("type", type);
    if (deviceModelId) {
      params.set("deviceModelId", deviceModelId);
    } else if (deviceTypeId) {
      params.set("deviceTypeId", deviceTypeId);
    }
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/movements?${params.toString()}`);
    const data = (await res.json()) as { total: number; items: Row[] };
    setTotal(data.total);
    setItems(data.items);
    setLoading(false);
  }, [page, type, deviceTypeId, deviceModelId, from, to]);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (deviceModelId && !models.some((m) => m.id === deviceModelId)) {
      setDeviceModelId("");
    }
  }, [deviceTypeId, models, deviceModelId]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">出入库记录</h1>
        <p className="text-sm text-slate-500 mt-1">
          可按大类、型号与时间筛选；列表含操作者与精确登记时间。
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="text-xs text-slate-600">
            单据类型
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm min-h-[40px]"
              value={type}
              onChange={(e) => {
                setPage(1);
                setType(e.target.value as typeof type);
              }}
            >
              <option value="ALL">全部</option>
              <option value="IN">入库</option>
              <option value="OUT">出库</option>
            </select>
          </label>
          <label className="text-xs text-slate-600">
            设备大类
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm min-h-[40px]"
              value={deviceTypeId}
              onChange={(e) => {
                setPage(1);
                setDeviceTypeId(e.target.value);
                setDeviceModelId("");
              }}
            >
              <option value="">全部</option>
              {categories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600">
            型号（可选）
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm min-h-[40px]"
              value={deviceModelId}
              onChange={(e) => {
                setPage(1);
                setDeviceModelId(e.target.value);
              }}
              disabled={!deviceTypeId}
            >
              <option value="">全部</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600">
            开始日期
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm min-h-[40px]"
              value={from}
              onChange={(e) => {
                setPage(1);
                setFrom(e.target.value);
              }}
            />
          </label>
          <label className="text-xs text-slate-600">
            结束日期
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm min-h-[40px]"
              value={to}
              onChange={(e) => {
                setPage(1);
                setTo(e.target.value);
              }}
            />
          </label>
        </div>
        <div className="text-xs text-slate-500">
          {loading ? "加载中…" : `共 ${total} 条记录，每页最多显示15条`}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-3 whitespace-nowrap">登记时间</th>
                <th className="px-3 py-3 whitespace-nowrap">单号</th>
                <th className="px-3 py-3 whitespace-nowrap">类型</th>
                <th className="px-3 py-3 whitespace-nowrap">大类</th>
                <th className="px-3 py-3 min-w-[140px]">型号</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">数量</th>
                <th className="px-3 py-3 min-w-[100px]">操作人</th>
                <th className="px-3 py-3 min-w-[120px]">用途/备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60 align-top">
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString("zh-CN", { hour12: false })}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{m.documentNo}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.type === "IN"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-rose-50 text-rose-800"
                      }`}
                    >
                      {m.type === "IN" ? "入库" : "出库"}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{m.deviceTypeName}</td>
                  <td className="px-3 py-2 text-slate-800">{m.modelLabel}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{m.quantity}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-medium">{m.operatorName}</div>
                    <div className="text-slate-500 font-mono">{m.operatorUsername}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-600 max-w-[200px] break-words">
                    {m.purpose || m.remark || "—"}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-500" colSpan={8}>
                    暂无记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-sm">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40 min-h-[40px]"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </button>
          <div className="text-slate-600">
            第 {page} / {totalPages} 页
          </div>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40 min-h-[40px]"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
