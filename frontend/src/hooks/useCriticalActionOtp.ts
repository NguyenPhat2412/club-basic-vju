"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError } from "@/lib/api";

type PendingChallenge<T> = {
  execute: (otpCode?: string) => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  originalError: unknown;
};

export function useCriticalActionOtp(actionContext: string) {
  const [open, setOpen] = useState(false);
  const pendingRef = useRef<PendingChallenge<unknown> | null>(null);

  const runWithOtp = useCallback(<T,>(execute: (otpCode?: string) => Promise<T>): Promise<T> => {
    return execute(undefined).catch((err) => {
      if (err instanceof ApiError && err.code === "TWO_FACTOR_REQUIRED") {
        return new Promise<T>((resolve, reject) => {
          pendingRef.current = {
            execute,
            resolve: resolve as (value: unknown) => void,
            reject,
            originalError: err,
          };
          setOpen(true);
        });
      }
      throw err;
    });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) {
      pending.reject(pending.originalError);
    }
  }, []);

  const handleSubmitOtp = useCallback(async (otpCode: string) => {
    const pending = pendingRef.current;
    if (!pending) return;
    const result = await pending.execute(otpCode);
    pendingRef.current = null;
    pending.resolve(result);
  }, []);

  return {
    runWithOtp,
    otpModalProps: {
      open,
      onClose: handleClose,
      purpose: "CRITICAL_ACTION" as const,
      actionContext,
      autoSendOnOpen: true,
      onSubmitOtp: handleSubmitOtp,
    },
  };
}
