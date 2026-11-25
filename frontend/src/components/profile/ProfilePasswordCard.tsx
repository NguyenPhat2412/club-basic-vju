"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole } from "lucide-react";
import { apiModel } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { describeError } from "@/components/shared/ListPage";
import { Button } from "@/components/ui/button";
import { FormField, PasswordInput } from "@/components/ui/input";

export function ProfilePasswordCard() {
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");

  const change = useMutation({
    mutationFn: () => apiModel.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setNotice("Mật khẩu đã được thay đổi thành công.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      queryClient.invalidateQueries({ queryKey: qk.me() });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setNotice("");
    if (newPassword === confirmPassword) change.mutate();
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2.5 border-b border-border/50 pb-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <LockKeyhole size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold tracking-tight text-foreground">Đổi mật khẩu</h3>
          <p className="text-[11px] text-muted-foreground">Cập nhật mật khẩu định kỳ để bảo vệ tài khoản VJU.</p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-4 grid min-w-0 gap-3">
        <FormField label="Mật khẩu hiện tại" required>
          <PasswordInput
            autoComplete="current-password"
            maxLength={128}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Mật khẩu mới" required hint="Ít nhất 8 ký tự.">
            <PasswordInput
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </FormField>
          <FormField label="Nhập lại mật khẩu mới" required>
            <PasswordInput
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </FormField>
        </div>
        {confirmPassword && newPassword !== confirmPassword && (
          <p className="text-xs text-destructive">Mật khẩu mới chưa khớp.</p>
        )}
        {notice && (
          <p role="status" className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-medium text-slate-900">
            {notice}
          </p>
        )}
        {change.error && <p role="alert" className="text-xs text-destructive">{describeError(change.error)}</p>}
        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            size="sm"
            className="h-8 w-full sm:w-auto"
            disabled={change.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword}
          >
            {change.isPending ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
          </Button>
        </div>
      </form>
    </section>
  );
}
