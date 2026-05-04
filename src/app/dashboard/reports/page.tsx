"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Summary = {
  totals: { in: number; out: number; net: number; records: number };
  byType: { deviceTypeId: string; name: string; in: number; out: number; net: number }[];
  byModel: {
    deviceModelId: string;
    deviceTypeName: string;
    modelLabel: string;
    in: number;
    out: number;
    net: number;
  }[];
  inventorySnapshot: {
    deviceModelId: string;
    deviceTypeName: string;
    modelLabel: string;
    quantity: number;
  }[];
  range: { from: string | null; to: string | null };
};

type Category = { id: string; name: string; models: { id: string; label: string }[] };

export default function ReportsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [deviceTypeId, setDeviceTypeId] = useState("");
  const [deviceModelId, setDeviceModelId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const models = useMemo(() => {
    const c = categories.find((x) => x.id === deviceTypeId);
    return c?.models ?? [];
  }, [categories, deviceTypeId]);

  const loadTypes = useCallback(async () => {
    const res = await fetch("/api/device-types");
    const j = (await res.json()) as { items: Category[] };
    setCategories(j.items);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (deviceModelId) params.set("deviceModelId", deviceModelId);
    else if (deviceTypeId) params.set("deviceTypeId", deviceTypeId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  const res = await fetch(`/api/reports/summary?${params.toString()}`);

// 先检查响应是否成功
if (!res.ok) {
  throw new Error(`API 请求失败: ${res.status} ${res.statusText}`);
}

// 先获取文本，再尝试解析 JSON，便于调试
const text = await res.text();
console.log("API 返回原始内容:", text); // 看控制台输出

// 再解析 JSON
const j = JSON.parse(text) as Summary;
    setData(j);
    setLoading(false);
  }, [deviceTypeId, deviceModelId, from, to]);

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

  function exportSummaryCsv() {
    if (!data) return;
    const rangeLabel = [data.range.from, data.range.to].filter(Boolean).join(" ~ ") || "全部时间";
    const lines: string[] = [];
    lines.push(["报表导出时间", new Date().toLocaleString("zh-CN", { hour12: false })].join(","));
    lines.push(["筛选区间", rangeLabel].join(","));
    lines.push("");
    lines.push(["指标", "值"].join(","));
    lines.push(["入库合计", String(data.totals.in)].join(","));
    lines.push(["出库合计", String(data.totals.out)].join(","));
    lines.push(["净变动", String(data.totals.net)].join(","));
    lines.push(["单据条数", String(data.totals.records)].join(","));
    lines.push("");
    lines.push(["设备大类", "入库", "出库", "净变动"].join(","));
    for (const r of data.byType) {
      lines.push([r.name, String(r.in), String(r.out), String(r.net)].join(","));
    }
    lines.push("");
    lines.push(["大类", "型号规格", "入库", "出库", "净变动"].join(","));
    for (const r of data.byModel) {
      lines.push(
        [r.deviceTypeName, r.modelLabel, String(r.in), String(r.out), String(r.net)].join(","),
      );
    }
    lines.push("");
    lines.push(["大类", "型号规格", "当前库存数量"].join(","));
    for (const r of data.inventorySnapshot) {
      lines.push([r.deviceTypeName, r.modelLabel, String(r.quantity)].join(","));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `汇总报表_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportDetailCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (deviceModelId) params.set("deviceModelId", deviceModelId);
      else if (deviceTypeId) params.set("deviceTypeId", deviceTypeId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/reports/export?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      let filename = `出入库明细_${new Date().toISOString().slice(0, 10)}.csv`;
      if (cd) {
        const m = /filename\*=UTF-8''([^;]+)/.exec(cd) || /filename="([^"]+)"/.exec(cd);
        if (m) {
          try {
            filename = decodeURIComponent(m[1]);
          } catch {
            /* ignore */
          }
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">报表</h1>
          <p className="text-sm text-slate-500 mt-1">
            汇总区间内的入出库；可导出「汇总表」或「逐条明细」（含登记时间、操作者）。
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={exportSummaryCsv}
            disabled={!data}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm hover:bg-slate-50 disabled:opacity-50 min-h-[44px]"
          >
            导出汇总 CSV
          </button>
          <button
            type="button"
            onClick={() => void exportDetailCsv()}
            disabled={exporting}
            className="rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 min-h-[44px]"
          >
            {exporting ? "导出中…" : "导出明细 CSV（含时间/操作者）"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-slate-600">
            设备大类
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-sm min-h-[44px]"
              value={deviceTypeId}
              onChange={(e) => {
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
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-sm min-h-[44px]"
              value={deviceModelId}
              onChange={(e) => setDeviceModelId(e.target.value)}
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
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-sm min-h-[44px]"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-600">
            结束日期
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-sm min-h-[44px]"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-3 text-xs text-slate-500">{loading ? "加载中…" : " "}</div>
      </div>

      {data && (
        <div className="grid gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs text-slate-500">入库合计</div>
              <div className="text-2xl font-semibold tabular-nums text-emerald-700">{data.totals.in}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">出库合计</div>
              <div className="text-2xl font-semibold tabular-nums text-rose-700">{data.totals.out}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">净变动</div>
              <div className="text-2xl font-semibold tabular-nums">{data.totals.net}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">单据条数</div>
              <div className="text-2xl font-semibold tabular-nums">{data.totals.records}</div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-800">
                按设备大类汇总
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-2">大类</th>
                      <th className="px-4 py-2 text-right">入</th>
                      <th className="px-4 py-2 text-right">出</th>
                      <th className="px-4 py-2 text-right">净</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.byType.map((r) => (
                      <tr key={r.deviceTypeId} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2">{r.name}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{r.in}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{r.out}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{r.net}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-800">
                按型号规格汇总
              </div>
              <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 sticky top-0">
                    <tr>
                      <th className="px-4 py-2">大类</th>
                      <th className="px-4 py-2">型号</th>
                      <th className="px-4 py-2 text-right">净变动</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.byModel.map((r) => (
                      <tr key={r.deviceModelId} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2 whitespace-nowrap">{r.deviceTypeName}</td>
                        <td className="px-4 py-2">{r.modelLabel}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{r.net}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-800">
              当前库存快照（按型号）
            </div>
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 sticky top-0">
                  <tr>
                    <th className="px-4 py-2">大类</th>
                    <th className="px-4 py-2">型号</th>
                    <th className="px-4 py-2 text-right">数量</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.inventorySnapshot.map((r) => (
                    <tr key={r.deviceModelId} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2 whitespace-nowrap">{r.deviceTypeName}</td>
                      <td className="px-4 py-2">{r.modelLabel}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
