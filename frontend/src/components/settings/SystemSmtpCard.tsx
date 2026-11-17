"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mail, Send, ShieldCheck, Trash2 } from "lucide-react";
import { apiModel, type SystemSettings, type SystemSettingsInput } from "@/lib/api";
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
  defaultRecipientEmail?: string;
  onChange: (next: SystemSettingsInput) => void;
}

export function SystemSmtpCard({
  current,
  draft,
  canEdit,
  hasUnsavedChanges,
  defaultRecipientEmail = "",
  onChange,
}: SystemSmtpCardProps) {
  const [testRecipient, setTestRecipient] = useState(defaultRecipientEmail);
  const smtpReady = Boolean((current.smtpHost ?? "").trim());

  const testMail = useMutation({
    mutationFn: () => apiModel.testSmtpEmail(testRecipient.trim()),
    onSuccess: () => {
      toast.success(`Đã gửi email kiểm tra mẫu OTP 3 tông màu tới ${testRecipient.trim()}.`);
    },
    onError: (err) => {
      toast.error(describeError(err));
    },
  });

  const passwordStatusText = draft.clearSmtpPassword
    ? "Sẽ xoá mật khẩu SMTP đã lưu khi bấm Lưu"
    : draft.smtpPassword?.trim()
      ? "Sẽ cập nhật mật khẩu SMTP mới khi bấm Lưu"
      : current.smtpPasswordConfigured
        ? "Đã lưu mật khẩu ứng dụng SMTP an toàn"
        : "Chưa lưu mật khẩu ứng dụng SMTP";

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-primary" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Máy chủ gửi Email (SMTP) & Mẫu thư OTP 3 Tông màu
          </h3>
        </div>
        <Badge tone={smtpReady ? "success" : "neutral"}>
          {smtpReady ? `Đang bật (${current.smtpHost}:${current.smtpPort})` : "Chưa cấu hình máy chủ SMTP"}
        </Badge>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 @4xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] @4xl:gap-6">
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-slate-600">
            Thiết lập máy chủ gửi thư (ví dụ Gmail SMTP <span className="font-mono font-semibold text-slate-900">smtp.gmail.com</span>, cổng{" "}
            <span className="font-mono font-semibold text-slate-900">587</span> kèm Mật khẩu ứng dụng 16 ký tự) để tự động gửi mã OTP khôi phục mật khẩu cho người dùng.
          </p>

          <div className="grid gap-3.5 sm:grid-cols-[minmax(0,1fr)_130px]">
            <FormField label="Máy chủ SMTP (Host)">
              <Input
                maxLength={255}
                disabled={!canEdit}
                value={draft.smtpHost ?? ""}
                onChange={(e) => onChange({ ...draft, smtpHost: e.target.value })}
                placeholder="VD: smtp.gmail.com"
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
              />
            </FormField>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <FormField label="Tài khoản đăng nhập SMTP">
              <Input
                maxLength={255}
                disabled={!canEdit}
                value={draft.smtpUsername ?? ""}
                onChange={(e) => onChange({ ...draft, smtpUsername: e.target.value })}
                placeholder="VD: clubhub@vju.ac.vn"
              />
            </FormField>

            <FormField label="Mật khẩu ứng dụng SMTP" hint={passwordStatusText}>
              <div className="flex items-center gap-2">
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
                  placeholder={current.smtpPasswordConfigured ? "•••••••••••• (để trống nếu giữ nguyên)" : "Nhập App Password..."}
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

          <div className="grid gap-3.5 sm:grid-cols-2">
            <FormField label="Email người gửi hiển thị">
              <Input
                type="email"
                maxLength={320}
                disabled={!canEdit}
                value={draft.smtpFromEmail ?? ""}
                onChange={(e) => onChange({ ...draft, smtpFromEmail: e.target.value })}
                placeholder="Mặc định lấy theo tài khoản SMTP"
              />
            </FormField>

            <FormField label="Tên người gửi hiển thị">
              <Input
                maxLength={120}
                disabled={!canEdit}
                value={draft.smtpFromName}
                onChange={(e) => onChange({ ...draft, smtpFromName: e.target.value })}
                placeholder="VJU ClubHub"
              />
            </FormField>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Mã hoá kết nối STARTTLS</p>
              <p className="text-xs text-slate-500">Khuyến nghị bật cho cổng 587 (Gmail, Microsoft 365, Google Workspace).</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.smtpStartTls}
              disabled={!canEdit}
              onClick={() => onChange({ ...draft, smtpStartTls: !draft.smtpStartTls })}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${draft.smtpStartTls ? "bg-primary" : "bg-slate-300"}`}
            >
              <span
                className={`absolute left-0 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${draft.smtpStartTls ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </div>

          {canEdit && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
              <p className="text-xs font-bold text-slate-900">Gửi email kiểm tra kết nối & giao diện</p>
              <p className="mt-0.5 text-[11.5px] text-slate-600">
                {hasUnsavedChanges
                  ? "Vui lòng bấm Lưu cài đặt ở thanh dưới cùng trước khi gửi email kiểm tra."
                  : "Gửi thử ngay một thư OTP mẫu tới hộp thư của bạn để kiểm tra kết nối SMTP."}
              </p>
              <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  maxLength={320}
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="nhap-email-nhan-thu@vju.ac.vn"
                  className="h-9 bg-white text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={hasUnsavedChanges || !smtpReady || !testRecipient.trim() || testMail.isPending}
                  onClick={() => testMail.mutate()}
                  className="shrink-0"
                >
                  <Send size={13} />
                  {testMail.isPending ? "Đang gửi thử…" : "Gửi email kiểm tra"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Live 3-Tone Email Design Preview */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <ShieldCheck size={13} className="text-primary" />
                Xem trước mẫu thư OTP (Hệ 3 Tông màu)
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                Từ: {draft.smtpFromName || "VJU ClubHub"}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="h-1.5 bg-primary" />
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-primary">
                      VIETNAM JAPAN UNIVERSITY · CLUBHUB
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">
                      Mã xác thực đặt lại mật khẩu
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap rounded-full border border-primary/20 bg-rose-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                    OTP BẢO MẬT
                  </span>
                </div>
              </div>

              <div className="space-y-3 px-4 py-3.5 text-xs text-slate-700">
                <p>
                  Xin chào <span className="font-bold text-slate-900">Sinh viên VJU</span>, nhập mã xác thực 6 chữ số dưới đây trên cửa sổ Khôi phục tài khoản:
                </p>

                <div className="rounded-xl border border-primary/25 bg-rose-50/70 py-3 text-center">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-primary">
                    MÃ XÁC THỰC 6 CHỮ SỐ CỦA BẠN
                  </p>
                  <p className="mt-1 font-mono text-2xl font-extrabold tracking-[0.28em] text-primary">
                    842 916
                  </p>
                </div>

                <div className="grid grid-cols-2 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50 text-[11px]">
                  <div className="px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Thời gian hiệu lực</p>
                    <p className="mt-0.5 font-bold text-slate-900">{draft.otpExpiryMinutes} phút</p>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Giới hạn xác thực</p>
                    <p className="mt-0.5 font-bold text-slate-900">Tối đa {draft.otpMaxVerifyAttempts} lần nhập</p>
                  </div>
                </div>

                <p className="rounded-md border-l-2 border-primary bg-slate-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-slate-600">
                  <strong className="text-slate-900">Lưu ý bảo mật:</strong> Tối đa{" "}
                  <strong className="text-slate-900">{draft.otpMaxSendCount} lần gửi/giờ</strong>, chờ{" "}
                  <strong className="text-slate-900">{draft.otpResendCooldownSeconds}s</strong> giữa hai lần gửi.
                </p>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[10.5px] text-slate-500">
                Trường Đại học Việt Nhật · ĐHQGHN — VJU ClubHub
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
