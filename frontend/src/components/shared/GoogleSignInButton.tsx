"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiModel, type AuthUserEnvelope } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";

type GoogleId = {
  initialize: (options: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    hd?: string;
    ux_mode?: "popup";
    auto_select?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
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
    script.onerror = () => {
      scriptLoad = null;
      reject(new Error("google script"));
    };
    document.head.appendChild(script);
  });
  return scriptLoad;
}

export function useGoogleSignIn() {
  return useQuery({
    queryKey: ["auth", "google-config"],
    queryFn: apiModel.googleConfig,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function GoogleSignInButton({
  onSignedIn,
  width = 360,
  withDivider = false,
  mode = "signin",
}: {
  onSignedIn: (envelope?: AuthUserEnvelope) => void;
  width?: number;
  withDivider?: boolean;
  mode?: "signin" | "signup";
}) {
  const config = useGoogleSignIn();
  const text = mode === "signup" ? "signup_with" : "signin_with";
  const holder = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signedIn = useRef(onSignedIn);
  useEffect(() => {
    signedIn.current = onSignedIn;
  }, [onSignedIn]);

  const clientId = config.data?.enabled ? config.data.clientId : null;
  const domain = config.data?.allowedDomains[0];

  useEffect(() => {
    if (!clientId || !holder.current) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        const google = window.google?.accounts.id;
        if (cancelled || !google || !holder.current) return;
        const containerWidth = holder.current.clientWidth || width;
        const responsiveWidth = Math.min(width, Math.max(240, containerWidth));
        google.initialize({
          client_id: clientId,
          hd: domain,
          ux_mode: "popup",
          auto_select: false,
          callback: async ({ credential }) => {
            if (!credential) return;
            setError("");
            setBusy(true);
            try {
              const envelope = await apiModel.googleLogin(credential, true);
              signedIn.current(envelope);
            } catch (err) {
              setError(describeError(err));
            } finally {
              setBusy(false);
            }
          },
        });
        holder.current.replaceChildren();
        google.renderButton(holder.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          logo_alignment: "left",
          locale: "vi",
          width: responsiveWidth,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError("Không tải được nút đăng nhập Google. Vui lòng kiểm tra mạng và thử lại.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, domain, width, text]);

  if (!clientId) return null;
  return (
    <div className="grid w-full gap-2.5">
      <div
        ref={holder}
        aria-busy={busy}
        className={busy ? "pointer-events-none flex min-h-10 w-full justify-center overflow-hidden opacity-60" : "flex min-h-10 w-full justify-center overflow-hidden"}
      />
      {busy && (
        <p className="text-center text-xs text-slate-600">
          Đang xác thực tài khoản Google VJU…
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
          {error}
        </p>
      )}
      {withDivider && <OrDivider />}
    </div>
  );
}

export function OrDivider({ label = "hoặc dùng email & mật khẩu" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
      <span className="h-px flex-1 bg-slate-200" />
      <span className="truncate">{label}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
