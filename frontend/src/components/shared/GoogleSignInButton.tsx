"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { apiModel, type AuthUserEnvelope } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { cn } from "@/lib/utils";

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

export function preloadGoogleScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptLoad ??= new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("google script")), { once: true });
      return;
    }
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
  const query = useQuery({
    queryKey: qk.auth("google-config"),
    queryFn: apiModel.googleConfig,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (query.data?.enabled && query.data.clientId) {
      void preloadGoogleScript().catch(() => undefined);
    }
  }, [query.data?.clientId, query.data?.enabled]);

  return query;
}

export function GoogleSignInButton({
  onSignedIn,
  width = 400,
  withDivider = false,
}: {
  onSignedIn: (envelope?: AuthUserEnvelope) => void;
  width?: number;
  withDivider?: boolean;
}) {
  const config = useGoogleSignIn();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const renderedSignatureRef = useRef<string>("");
  const renderedWidthRef = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signedIn = useRef(onSignedIn);

  useEffect(() => {
    signedIn.current = onSignedIn;
  }, [onSignedIn]);

  const clientId = config.data?.enabled ? config.data.clientId : null;
  const domain = config.data?.allowedDomains[0];

  useEffect(() => {
    if (!clientId || !holderRef.current || !wrapperRef.current) return;
    let cancelled = false;
    let revealTimer: number | null = null;
    let fallbackTimer: number | null = null;

    const renderForWidth = (rawWidth: number) => {
      const google = window.google?.accounts.id;
      const holder = holderRef.current;
      if (cancelled || !google || !holder || rawWidth < 200) return;

      // Google GSI supports 200..400px; locking exact container width aligns flush with form inputs.
      const targetWidth = Math.min(400, Math.max(240, Math.floor(rawWidth)));
      const signature = `${clientId}:${domain ?? ""}`;
      if (
        renderedSignatureRef.current === signature &&
        Math.abs(targetWidth - renderedWidthRef.current) < 4 &&
        holder.childElementCount > 0
      ) {
        return;
      }
      renderedSignatureRef.current = signature;
      renderedWidthRef.current = targetWidth;
      setReady(false);

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

      holder.replaceChildren();
      google.renderButton(holder, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        locale: "vi",
        width: targetWidth,
      });

      const markReady = () => {
        if (cancelled) return;
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
        if (revealTimer) window.clearTimeout(revealTimer);
        // Wait 120ms after iframe load so Google finishes swapping its stub div -> personalized iframe invisibly.
        revealTimer = window.setTimeout(() => {
          if (!cancelled) setReady(true);
        }, 120);
      };

      const iframe = holder.querySelector("iframe");
      if (iframe) {
        iframe.addEventListener("load", markReady, { once: true });
      }
      fallbackTimer = window.setTimeout(() => {
        if (!cancelled) setReady(true);
      }, 420);
    };

    preloadGoogleScript()
      .then(() => {
        if (cancelled || !wrapperRef.current) return;
        const measured = wrapperRef.current.getBoundingClientRect().width;
        if (measured >= 200) {
          renderForWidth(measured);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Không tải được nút đăng nhập Google. Vui lòng kiểm tra mạng và thử lại.");
        }
      });

    let resizeTimer: number | null = null;
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect.width ?? 0;
            if (w < 200 || !window.google?.accounts?.id) return;
            if (resizeTimer) window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => renderForWidth(w), 150);
          })
        : null;
    if (observer && wrapperRef.current) {
      observer.observe(wrapperRef.current);
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (resizeTimer) window.clearTimeout(resizeTimer);
      if (revealTimer) window.clearTimeout(revealTimer);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
    };
  }, [clientId, domain, width]);

  if (!clientId) return null;
  return (
    <div ref={wrapperRef} className="grid w-full gap-2.5">
      <div className="relative flex h-[42px] w-full items-center justify-center">
        {!ready && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 h-[40px] animate-pulse rounded-[4px] border border-slate-200 bg-slate-50"
          />
        )}
        <div
          ref={holderRef}
          aria-busy={busy}
          className={cn(
            "flex h-[42px] w-full items-center justify-center transition-opacity duration-150",
            !ready && "pointer-events-none opacity-0",
            busy && "pointer-events-none opacity-60",
          )}
        />
      </div>
      {busy && <p className="text-center text-xs text-slate-600">Đang xác thực tài khoản Google VJU…</p>}
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
