"use client";

import { useMutation } from "@tanstack/react-query";
import { BellRing, Info, Send, ShieldAlert, Trash2 } from "lucide-react";
import { apiModel, SystemSettings, SystemSettingsInput } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, PasswordInput } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

interface SystemTelegramCardProps {
  current: SystemSettings;
  draft: SystemSettingsInput;
  canEdit: boolean;
  hasUnsavedChanges: boolean;
  onChange: (next: SystemSettingsInput) => void;
}

function tokenHint(
  clearing: boolean | undefined,
  pendingValue: string | undefined,
  storedInDb: boolean,
  effectiveReady: boolean,
) {
  if (clearing) return "Sẽ xoá khi lưu";
  if ((pendingValue ?? "").trim()) return "Sẽ mã hoá AES-256-GCM";
  if (storedInDb) return "Đã lưu mã hoá";
  if (effectiveReady) return "Đang dùng từ .env";
  return undefined;
}

export function SystemTelegramCard({
  current,
  draft,
  canEdit,
  hasUnsavedChanges,
  onChange,
}: SystemTelegramCardProps) {
  const testTelegram = useMutation({
    mutationFn: () => apiModel.testTelegramAlert(),
    onSuccess: () => {
      toast.success("Đã gửi tin nhắn kiểm tra tới Telegram thành công.");
    },
    onError: (err) => {
      toast.error(describeError(err));
    },
  });

  const hint = tokenHint(
    draft.clearTelegramBotToken,
    draft.telegramBotToken,
    current.telegramBotTokenConfigured,
    current.telegramConfigured,
  );

  const alertRules: {
    key:
      | "telegramAlertOnFailedLogin"
      | "telegramAlertOnRateLimit"
      | "telegramAlertOnAdminLogin"
      | "telegramAlertOnSettingsChange"
      | "telegramAlertOnServerError"
      | "telegramAlertOnBroadcast";
    label: string;
    tooltip: string;
  }[] = [
    {
      key: "telegramAlertOnFailedLogin",
      label: "Brute-force đăng nhập",
      tooltip: "Gửi cảnh báo kèm IP khi số lần đăng nhập thất bại vượt ngưỡng trong 10 phút.",
    },
    {
      key: "telegramAlertOnRateLimit",
      label: "Chặn vượt ngưỡng (HTTP 429)",
      tooltip: "Thông báo ngay khi IP gửi yêu cầu dồn dập bị Rate-Limit chặn.",
    },
    {
      key: "telegramAlertOnAdminLogin",
      label: "Đăng nhập tài khoản Quản trị",
      tooltip: "Thông báo kèm địa chỉ IP và thiết bị khi Quản trị viên đăng nhập.",
    },
    {
      key: "telegramAlertOnSettingsChange",
      label: "Cấu hình, IP & Ngắt phiên",
      tooltip: "Thông báo khi đổi cài đặt hệ thống, bật bảo trì, chặn/gỡ IP hoặc ngắt phiên người dùng.",
    },
    {
      key: "telegramAlertOnServerError",
      label: "Lỗi máy chủ (HTTP 500)",
      tooltip: "Báo ngay khi backend phát sinh lỗi 500 bất ngờ kèm endpoint và IP (đã lọc lỗi ngắt kết nối sớm).",
    },
    {
      key: "telegramAlertOnBroadcast",
      label: "Phát thông báo hàng loạt",
      tooltip: "Thông báo khi có chiến dịch phát thông báo toàn trường / BCN hoặc gửi nhắc chưa đọc.",
    },
  ];

  const activeRuleCount = alertRules.filter((r) => draft[r.key]).length;
  const setAllRules = (enabled: boolean) => {
    onChange({
      ...draft,
      telegramAlertOnFailedLogin: enabled,
      telegramAlertOnRateLimit: enabled,
      telegramAlertOnAdminLogin: enabled,
      telegramAlertOnSettingsChange: enabled,
      telegramAlertOnServerError: enabled,
      telegramAlertOnBroadcast: enabled,
    });
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <BellRing size={14} className="text-primary" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Cảnh báo Telegram
          </h3>
          <Badge tone={current.telegramEnabled && current.telegramConfigured ? "success" : "neutral"}>
            {current.telegramEnabled && current.telegramConfigured
              ? "Đang bật"
              : current.telegramConfigured
                ? "Đã kết nối"
                : "Chưa cấu hình"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
            <span>Bật cảnh báo tự động</span>
            <button
              type="button"
              role="switch"
              aria-label="Bật cảnh báo tự động"
              aria-checked={draft.telegramEnabled}
              disabled={!canEdit}
              onClick={() => onChange({ ...draft, telegramEnabled: !draft.telegramEnabled })}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                draft.telegramEnabled ? "bg-primary" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute left-0 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
                  draft.telegramEnabled ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={hasUnsavedChanges || !current.telegramConfigured || testTelegram.isPending}
              onClick={() => testTelegram.mutate()}
              title={hasUnsavedChanges ? "Lưu cài đặt trước khi gửi thử" : undefined}
            >
              <Send size={13} />
              {testTelegram.isPending ? "Đang gửi…" : "Gửi tin nhắn thử Telegram"}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3.5 p-4">
        {/* Horizontal row 1: Credentials & Thresholds */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <FormField label="Telegram Bot Token" hint={hint}>
            <div className="flex w-full items-center gap-1">
              <div className="min-w-0 flex-1">
                <PasswordInput
                  maxLength={256}
                  autoComplete="new-password"
                  disabled={!canEdit}
                  value={draft.telegramBotToken ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      telegramBotToken: e.target.value,
                      clearTelegramBotToken: false,
                    })
                  }
                  placeholder={
                    current.telegramBotTokenConfigured ? "••••••••" : "123456789:AAH..."
                  }
                  className="h-8.5 w-full font-mono text-xs"
                />
              </div>
              {canEdit && current.telegramBotTokenConfigured && !draft.clearTelegramBotToken && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8.5 shrink-0 px-2"
                  onClick={() =>
                    onChange({ ...draft, telegramBotToken: "", clearTelegramBotToken: true })
                  }
                  title="Xoá Telegram Bot Token đã lưu"
                >
                  <Trash2 size={13} />
                </Button>
              )}
            </div>
          </FormField>

          <FormField label="Telegram Chat ID">
            <Input
              maxLength={128}
              disabled={!canEdit}
              value={draft.telegramChatId ?? ""}
              onChange={(e) => onChange({ ...draft, telegramChatId: e.target.value })}
              placeholder="-1001234567890"
              className="h-8.5 font-mono text-xs"
            />
          </FormField>

          <FormField label="Topic / Thread ID">
            <Input
              maxLength={64}
              disabled={!canEdit}
              value={draft.telegramThreadId ?? ""}
              onChange={(e) => onChange({ ...draft, telegramThreadId: e.target.value })}
              placeholder="Forum Topic ID"
              className="h-8.5 font-mono text-xs"
            />
          </FormField>

          <FormField label="Ngưỡng sai MK" required>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={2}
                max={50}
                disabled={!canEdit}
                value={draft.telegramFailedLoginThreshold}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    telegramFailedLoginThreshold: Math.max(
                      2,
                      Math.min(50, Number(e.target.value) || 5),
                    ),
                  })
                }
                title="Số lần đăng nhập sai tối đa từ 1 IP trong 10 phút trước khi báo Telegram"
                className="h-8.5 text-right font-mono text-xs"
              />
              <span className="shrink-0 text-[11px] text-slate-500">lần/10p</span>
            </div>
          </FormField>

          <FormField label="Chống spam" required>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={10}
                max={3600}
                disabled={!canEdit}
                value={draft.telegramCooldownSeconds}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    telegramCooldownSeconds: Math.max(
                      10,
                      Math.min(3600, Number(e.target.value) || 180),
                    ),
                  })
                }
                className="h-8.5 text-right font-mono text-xs"
              />
              <span className="shrink-0 text-[11px] text-slate-500">giây</span>
            </div>
          </FormField>
        </div>

        {/* Horizontal row 2: 6 trigger switches in crisp 3x2 grid with quick toggle-all */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Sự kiện kích hoạt cảnh báo
              </span>
              <Badge tone="neutral">
                <span data-no-i18n="true">{activeRuleCount}/{alertRules.length}</span>
              </Badge>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6.5 px-2 text-[11px]"
                  disabled={activeRuleCount === alertRules.length}
                  onClick={() => setAllRules(true)}
                >
                  Bật tất cả
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6.5 px-2 text-[11px]"
                  disabled={activeRuleCount === 0}
                  onClick={() => setAllRules(false)}
                >
                  Tắt tất cả
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alertRules.map((rule) => (
              <div
                key={rule.key}
                title={rule.tooltip}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-800">
                  <ShieldAlert size={13} className="shrink-0 text-primary" />
                  <span className="truncate">{rule.label}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-label={rule.label}
                  aria-checked={draft[rule.key]}
                  disabled={!canEdit}
                  onClick={() => onChange({ ...draft, [rule.key]: !draft[rule.key] })}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                    draft[rule.key] ? "bg-primary" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute left-0 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
                      draft[rule.key] ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Single-line setup tip */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          <Info size={13} className="shrink-0 text-primary" />
          <span>Lấy token qua</span>
          <code data-no-i18n="true" className="rounded bg-white px-1 py-0.5 font-mono text-slate-700">@BotFather</code>
          <span>→</span>
          <code data-no-i18n="true" className="rounded bg-white px-1 py-0.5 font-mono text-slate-700">/newbot</code>
          <span>·</span>
          <span>Lấy Chat ID qua</span>
          <code data-no-i18n="true" className="rounded bg-white px-1 py-0.5 font-mono text-slate-700">@userinfobot</code>
        </div>
      </div>
    </section>
  );
}
