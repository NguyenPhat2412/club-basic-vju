"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiModel } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";

type GoogleId = {
  initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void; hd?: string; ux_mode?: "popup"; auto_select?: boolean; use_fedcm_for_prompt?: boolean }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
};
declare global {
  interface Window { google?: { accounts: { id: GoogleId } } }
}

const SCRIPT = "https://accounts.google.com/gsi/client";
let scriptLoad: Promise<void> | null = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptLoad ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { scriptLoad = null; reject(new Error("google script")); };
    document.head.appendChild(script);
  });
  return scriptLoad;
}

export function useGoogleSignIn() {
  return useQuery({ queryKey: ["auth", "google-config"], queryFn: apiModel.googleConfig, staleTime: 5 * 60_000, retry: 1 });
}

export function GoogleSignInButton({ onSignedIn, width = 320, withDivider = false }: { onSignedIn: () => void; width?: number; withDivider?: boolean }) {
  const config = useGoogleSignIn();
  const holder = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signedIn = useRef(onSignedIn);
  useEffect(() => { signedIn.current = onSignedIn; }, [onSignedIn]);

  const clientId = config.data?.enabled ? config.data.clientId : null;
  const domain = config.data?.allowedDomains[0];

  useEffect(() => {
    if (!clientId || !holder.current) return;
    let cancelled = false;
    loadGoogleScript().then(() => {
      const google = window.google?.accounts.id;
      if (cancelled || !google || !holder.current) return;
      google.initialize({
        client_id: clientId,
        hd: domain,
        ux_mode: "popup",
        auto_select: false,
        callback: async ({ credential }) => {
          if (!credential) return;
          setError(""); setBusy(true);
          try { await apiModel.googleLogin(credential); signedIn.current(); }
          catch (err) { setError(describeError(err)); }
          finally { setBusy(false); }
        },
      });
      holder.current.replaceChildren();
      google.renderButton(holder.current, { type: "standard", theme: "outline", size: "large", text: "signin_with", shape: "rectangular", logo_alignment: "left", locale: "vi", width });
    }).catch(() => { if (!cancelled) setError("Không tải được nút đăng nhập Google. Vui lòng kiểm tra mạng và thử lại."); });
    return () => { cancelled = true; };
  }, [clientId, domain, width]);

  if (!clientId) return null;
  return (
    <div className="grid gap-2">
      <div ref={holder} aria-busy={busy} className={busy ? "pointer-events-none min-h-10 opacity-60" : "min-h-10"} />
      {busy && <p className="text-[11px] text-[#77716a]">Đang đăng nhập bằng Google…</p>}
      {error && <p role="alert" className="border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">{error}</p>}
      {withDivider && <OrDivider />}
    </div>
  );
}

export function OrDivider({ label = "hoặc mật khẩu (cán bộ, quản trị)" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[.14em] text-[#99928a]">
      <span className="h-px flex-1 bg-[#e8e4df]" />{label}<span className="h-px flex-1 bg-[#e8e4df]" />
    </div>
  );
}
