"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { apiModel } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";

export function FirstLoginPassword({ email }: { email?: string }) {
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const mutation = useMutation({
    mutationFn: () => apiModel.changePassword(current, next),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await queryClient.invalidateQueries({ queryKey: ["optional-me"] });
    },
  });
  const mismatch = confirmation.length > 0 && confirmation !== next;
  const sameAsCurrent = next.length > 0 && next === current;
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirmation && !sameAsCurrent;

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto p-4">
      <form className="panel-modal w-full max-w-md space-y-4 p-6"
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate(); }}>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound size={20} /></span>
          <div>
            <h1 className="text-lg font-black tracking-tight">Đặt mật khẩu của bạn</h1>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Tài khoản này do quản trị viên tạo hoặc vừa được đặt lại mật khẩu. Hãy chọn mật khẩu riêng trước khi sử dụng hệ thống.
        </p>
        <FormField label="Mật khẩu được cấp" required>
          <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </FormField>
        <FormField label="Mật khẩu mới" required hint="Tối thiểu 8 ký tự, khác mật khẩu được cấp">
          <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </FormField>
        <FormField label="Nhập lại mật khẩu mới" required>
          <Input type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
        </FormField>
        {mismatch && <p className="text-xs text-destructive">Mật khẩu nhập lại không khớp.</p>}
        {sameAsCurrent && <p className="text-xs text-destructive">Mật khẩu mới phải khác mật khẩu được cấp.</p>}
        {mutation.error && <p className="text-xs text-destructive">{errorMessage(mutation.error)}</p>}
        <Button type="submit" className="w-full" disabled={!canSubmit || mutation.isPending}>
          {mutation.isPending ? "Đang lưu…" : "Lưu mật khẩu và tiếp tục"}
        </Button>
      </form>
    </div>
  );
}
