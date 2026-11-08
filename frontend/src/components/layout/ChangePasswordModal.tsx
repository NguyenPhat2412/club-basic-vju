"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { apiModel } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { FormField, Input } from "@/components/ui/input";
import { ModalShell } from "@/components/shared/Overlays";

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [done, setDone] = useState(false);
  const mutation = useMutation({ mutationFn: () => apiModel.changePassword(current, next), onSuccess: () => { setDone(true); setCurrent(""); setNext(""); } });
  const close = () => { setDone(false); mutation.reset(); onClose(); };
  return (
    <ModalShell open={open} onClose={close} title="Đổi mật khẩu" icon={<KeyRound />} size="sm" onSubmit={done ? undefined : () => mutation.mutate()}
      submitLabel="Đổi mật khẩu" submitLoading={mutation.isPending} submitDisabled={!current || next.length < 8}>
      {done ? <p className="text-sm text-primary">Đã đổi mật khẩu. Các phiên đăng nhập khác đã bị đăng xuất.</p> : <>
        <FormField label="Mật khẩu hiện tại" required><Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></FormField>
        <FormField label="Mật khẩu mới" required hint="Tối thiểu 8 ký tự"><Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></FormField>
        {mutation.error && <p className="text-xs text-destructive">{errorMessage(mutation.error)}</p>}
      </>}
    </ModalShell>
  );
}
