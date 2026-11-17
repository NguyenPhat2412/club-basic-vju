"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mail, Send, Trash2 } from "lucide-react";
import { apiModel, SystemSettings, SystemSettingsInput } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, PasswordInput } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

interface SystemSmtpCardProps {
  current: SystemSettings;
  draft: SystemSettingsInput;
  canEdit: boolean;
  hasUnsavedChanges: boolean;
  defaultRecipientEmail: string;
  onChange: (next: SystemSettingsInput) => void;
}

export function SystemSmtpCard({
  current,
  draft,
  canEdit,
  hasUnsavedChanges,
  defaultRecipientEmail,
  onChange,
}: SystemSmtpCardProps) {
  const [testRecipient, setTestRecipient] = useState(defaultRecipientEmail);

  const testMail = useMutation({
    mutationFn: () => apiModel.testSmtpEmail(testRecipient.trim()),
    onSuccess: () => {
      toast.success(`Đã gửi email kiểm tra tới ${testRecipient.trim()}.`);
    },
    onError: (err) => {
      toast.error(describeError(err));
    },
  });

  const smtpReady = Boolean((current.smtpHost ?? "").trim());
  const passwordStatusText = draft.clearSmtpPassword
    ? "Sẽ xoá khi lưu"
    : (draft.smtpPassword ?? "").trim()
      ? "Sẽ lưu mật khẩu mới"
      : current.smtpPasswordConfigured
        ? "Đã cấu hình an toàn"
        : "Chưa có mật khẩu";

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-primary" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Máy chủ gửi Email (SMTP) & Mẫu thư OTP 3 Tông màu
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...draft,
                  smtpHost: "smtp.gmail.com",
                  smtpPort: 587,
                  smtpStartTls: true,
                })
              }
              className="rounded-full border border-primary/25 bg-white px-2.5 py-0.5 text-[10.5px] font-bold text-primary transition-colors hover:bg-primary/5"
            >
              Điền nhanh Gmail (smtp.gmail.com:587)
            </button>
          )}
          <Badge tone={smtpReady ? "success" : "neutral"}>
            {smtpReady ? `Đang bật (${current.smtpHost}:${current.smtpPort})` : "Chưa cấu hình máy chủ SMTP"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 @4xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] @4xl:items-start">
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
            <FormField label="Máy chủ SMTP (Host)">
              <Input
                maxLength={255}
                disabled={!canEdit}
                value={draft.smtpHost ?? ""}
                onChange={(e) => onChange({ ...draft, smtpHost: e.target.value })}
                placeholder="smtp.gmail.com"
                className="h-9"
              />
            </FormField>
            <FormField label="Cổng SMTP">
              <Input
                type="number"
                min={1}
                max={65535}
                disabled={!canEdit}
                value={draft.smtpPort}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    smtpPort: Math.max(1, Math.min(65535, Number(e.target.value) || 587)),
                  })
                }
                className="h-9"
              />
            </FormField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Email tài khoản gửi SMTP" hint="Nhập địa chỉ email gửi thư (VD: ten-ban@gmail.com)">
              <Input
                maxLength={255}
                disabled={!canEdit}
                value={draft.smtpUsername ?? ""}
                onChange={(e) => onChange({ ...draft, smtpUsername: e.target.value })}
                placeholder="masterrio2412@gmail.com"
                className="h-9"
              />
            </FormField>

            <FormField label="Mật khẩu ứng dụng SMTP" hint={passwordStatusText}>
              <div className="flex items-center gap-1.5">
                <PasswordInput
                  maxLength={500}
                  autoComplete="new-password"
                  disabled={!canEdit}
                  value={draft.smtpPassword ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      smtpPassword: e.target.value,
                      clearSmtpPassword: false,
                    })
                  }
                  placeholder={current.smtpPasswordConfigured ? "•••••••• (giữ nguyên)" : "App Password 16 ký tự"}
                  className="h-9"
                />
                {canEdit && current.smtpPasswordConfigured && !draft.clearSmtpPassword && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onChange({ ...draft, smtpPassword: "", clearSmtpPassword: true })}
                    title="Xoá mật khẩu SMTP đã lưu"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </FormField>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <FormField label="Email hiển thị">
              <Input
                type="email"
                maxLength={320}
                disabled={!canEdit}
                value={draft.smtpFromEmail ?? ""}
                onChange={(e) => onChange({ ...draft, smtpFromEmail: e.target.value })}
                placeholder="Theo tài khoản gửi"
                className="h-9"
              />
            </FormField>

            <FormField label="Tên người gửi">
              <Input
                maxLength={120}
                disabled={!canEdit}
                value={draft.smtpFromName}
                onChange={(e) => onChange({ ...draft, smtpFromName: e.target.value })}
                placeholder="VJU ClubHub"
                className="h-9"
              />
            </FormField>

            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700">
              <span>STARTTLS</span>
              <button
                type="button"
                role="switch"
                aria-checked={draft.smtpStartTls}
                disabled={!canEdit}
                onClick={() => onChange({ ...draft, smtpStartTls: !draft.smtpStartTls })}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${draft.smtpStartTls ? "bg-primary" : "bg-slate-300"}`}
              >
                <span
                  className={`absolute left-0 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${draft.smtpStartTls ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </button>
            </label>
          </div>

          {canEdit && (
            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 sm:flex-row sm:items-center">
              <Input
                type="email"
                maxLength={320}
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="Email nhận thư kiểm tra"
                className="h-8.5 bg-white text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={hasUnsavedChanges || !smtpReady || !testRecipient.trim() || testMail.isPending}
                onClick={() => testMail.mutate()}
                className="shrink-0"
                title={hasUnsavedChanges ? "Lưu cài đặt trước khi gửi thử" : undefined}
              >
                <Send size={13} />
                {testMail.isPending ? "Đang gửi…" : "Gửi email kiểm tra"}
              </Button>
            </div>
          )}
        </div>

        {/* Compact 3-Tone OTP Email Preview */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between text-[10.5px] font-semibold text-slate-500">
            <span className="uppercase tracking-wider text-slate-600">Xem trước thư OTP</span>
            <span>{draft.smtpFromName || "VJU ClubHub"}</span>
          </div>

          <div className="mx-auto max-w-[340px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
            <div className="h-1 bg-primary" />
            <div className="space-y-2.5 p-3.5 text-xs text-slate-700">
              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-primary">VJU CLUBHUB</p>
                <p className="mt-0.5 text-sm font-extrabold text-slate-900">Mã OTP đặt lại mật khẩu</p>
              </div>

              <p className="text-[11.5px] text-slate-600">
                Xin chào <strong className="text-slate-900">Sinh viên VJU</strong>, mã xác thực của bạn là:
              </p>

              <div className="rounded-lg border border-primary/25 bg-rose-50/70 py-2.5 text-center font-mono text-xl font-extrabold tracking-[0.28em] text-primary">
                842 916
              </div>

              <p className="text-[11px] leading-4 text-slate-500">
                Hiệu lực <strong className="text-slate-800">{draft.otpExpiryMinutes} phút</strong> · Tối đa{" "}
                <strong className="text-slate-800">{draft.otpMaxVerifyAttempts} lần</strong> nhập · Không chia sẻ mã này.
              </p>
            </div>
            <div className="border-t border-slate-100 bg-slate-50 px-3.5 py-1.5 text-[10px] text-slate-400">
              Trường Đại học Việt Nhật · ĐHQGHN
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
