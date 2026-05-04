"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function QrLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("链接无效");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/qr/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, username, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(j?.error ?? "确认失败");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  if (!token) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 bg-slate-50 safe-pb">
        <p className="text-sm text-slate-600 text-center max-w-sm">
          缺少 token，请重新扫描电脑端二维码。
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 safe-pb">
      <div className="w-full max-w-[min(100%,420px)] rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-lg">
        <h1 className="text-lg sm:text-xl font-semibold text-slate-900 text-center">确认登录</h1>
        <p className="text-sm text-slate-500 mt-2 text-center leading-relaxed">
          正在为电脑端授权。请输入账号密码完成确认。
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-xs font-medium text-slate-600">用户名</label>
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3.5 text-base sm:text-sm text-slate-900 min-h-[48px]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">密码</label>
            <input
              type="password"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3.5 text-base sm:text-sm text-slate-900 min-h-[48px]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 px-3 py-3.5 text-base sm:text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 min-h-[52px] active:scale-[0.99] transition-transform shadow-sm"
          >
            {loading ? "提交中…" : "确认登录"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function QrLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center p-6 text-slate-500">
          加载中…
        </div>
      }
    >
      <QrLoginInner />
    </Suspense>
  );
}
