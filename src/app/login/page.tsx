"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "password" | "qr";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrHint, setQrHint] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const clearPoll = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startQr = useCallback(async () => {
    setError(null);
    setQrHint("正在生成二维码…");
    setQrImage(null);
    clearPoll();
    const res = await fetch("/api/auth/qr/init", { method: "POST" });
    if (!res.ok) {
      setQrHint(null);
      setError("生成二维码失败，请重试");
      return;
    }
    const data = (await res.json()) as { token: string; qrDataUrl: string };
    setQrImage(data.qrDataUrl);
    setQrHint("请使用手机扫描，并在手机上完成登录确认");

    pollRef.current = window.setInterval(async () => {
      const st = await fetch(`/api/auth/qr/status?token=${encodeURIComponent(data.token)}`, {
        credentials: "include",
      });
      const body = (await st.json()) as { status: string };
      if (body.status === "ok") {
        clearPoll();
        router.replace("/dashboard");
        router.refresh();
      }
      if (body.status === "expired") {
        clearPoll();
        setQrHint("二维码已过期，请点击下方按钮刷新");
        setQrImage(null);
      }
    }, 1500);
  }, [router]);

  useEffect(() => {
    return () => clearPoll();
  }, []);

  useEffect(() => {
    if (tab === "qr") {
      void startQr();
    } else {
      clearPoll();
    }
  }, [tab, startQr]);

  async function onPasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(j?.error ?? "登录失败");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-100 to-slate-200 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900">网络设备出入库管理</h1>
          <p className="text-sm text-slate-500 mt-1">请登录后继续</p>
        </div>

        <div className="mt-6 flex rounded-lg bg-slate-100 p-1 text-sm">
          <button
            type="button"
            className={`flex-1 rounded-md py-2 ${tab === "password" ? "bg-white shadow-sm" : ""}`}
            onClick={() => setTab("password")}
          >
            账号登录
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-2 ${tab === "qr" ? "bg-white shadow-sm" : ""}`}
            onClick={() => setTab("qr")}
          >
            扫码登录
          </button>
        </div>

        {tab === "password" ? (
          <form className="mt-6 space-y-4" onSubmit={onPasswordLogin}>
            <div>
              <label className="block text-xs font-medium text-slate-600">用户名</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-brand-500 min-h-[48px]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">密码</label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-base sm:text-sm outline-none focus:ring-2 focus:ring-brand-500 min-h-[48px]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-600 px-3 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 min-h-[48px] active:scale-[0.99] transition-transform"
            >
              {loading ? "登录中…" : "登录"}
            </button>
            <p className="text-xs text-slate-500 leading-relaxed">
              演示：<span className="font-mono">admin / admin123</span>，仓管{" "}
              <span className="font-mono">operator / operator123</span>，用户{" "}
              <span className="font-mono">user / user123</span>
            </p>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex justify-center">
              {qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="登录二维码"
                  className="h-52 w-52 sm:h-56 sm:w-56 max-w-[min(100%,280px)] rounded-lg border border-slate-200"
                  src={qrImage}
                />
              ) : (
                <div className="h-56 w-56 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-sm text-slate-500">
                  生成中…
                </div>
              )}
            </div>
            <p className="text-sm text-slate-600 text-center">{qrHint}</p>
            <p className="text-xs text-slate-500 text-center">
              手机扫码后会打开确认页，请输入同一套账号密码完成授权；请确保手机能访问电脑{" "}
              <code className="font-mono">NEXT_PUBLIC_APP_URL</code> 所配置的地址（局域网请用 IP）。
            </p>
            <button
              type="button"
              onClick={() => void startQr()}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              刷新二维码
            </button>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
