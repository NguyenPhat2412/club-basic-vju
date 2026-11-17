"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { Settings } from "lucide-react";
import { apiModel, SystemSettings, SystemSettingsInput } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import {
  createSystemSettingsDraft,
  hasSystemSettingsChanged,
  SYSTEM_SETTINGS_GROUPS,
  toSystemSettingsPayload,
} from "@/forms/settings/settings-form";
import { SystemSmtpCard } from "./SystemSmtpCard";

export function SystemSettingsView() {
  const session = useSession();
  const canView = session.can("setting.view");
  const canEdit = session.can("setting.update");
  const [notice, setNotice] = useState<{ seq: number; text: string } | null>(null);
  const settings = useQuery({
    queryKey: qk.systemSettings(),
    queryFn: apiModel.systemSettings,
    enabled: session.ready && canView,
  });

  if (session.ready && !canView) {
    return (
      <ListPage title="Cài đặt hệ thống">
        <EmptyState icon={<Settings />} title="Bạn không có quyền xem cài đặt hệ thống" />
      </ListPage>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <BreadcrumbToolbar
        crumbs={[{ label: "Quản trị hệ thống" }, { label: "Cài đặt hệ thống" }]}
        refreshing={settings.isFetching}
        onRefresh={() => settings.refetch()}
      />
      {notice && <Notice key={notice.seq} tone="success">{notice.text}</Notice>}
      <div className="w-full space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        <p className="text-sm text-slate-600">
          Các thay đổi giới hạn nghiệp vụ, chính sách mã OTP và máy chủ gửi email có hiệu lực ngay sau khi lưu.
        </p>
        {settings.isPending ? (
          <LoadingRows rows={3} />
        ) : settings.isError ? (
          <ErrorState message={describeError(settings.error)} onRetry={() => settings.refetch()} />
        ) : (
          <SettingsForm
            key={settings.data.updatedAt ?? "default"}
            current={settings.data}
            canEdit={canEdit}
            defaultRecipientEmail={session.user?.email ?? ""}
            onSaved={(saved) =>
              setNotice((prev) => ({
                seq: (prev?.seq ?? 0) + 1,
                text: `Đã cập nhật cài đặt hệ thống lúc ${formatDateTime(saved.updatedAt)}.`,
              }))
            }
          />
        )}
      </div>
    </div>
  );
}

function SettingsForm({
  current,
  canEdit,
  defaultRecipientEmail,
  onSaved,
}: {
  current: SystemSettings;
  canEdit: boolean;
  defaultRecipientEmail: string;
  onSaved: (saved: SystemSettings) => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<SystemSettingsInput>(() => createSystemSettingsDraft(current));
  const save = useMutation({
    mutationFn: () => apiModel.updateSystemSettings(toSystemSettingsPayload(draft)),
    onSuccess: (saved) => {
      queryClient.setQueryData(qk.systemSettings(), saved);
      setDraft(createSystemSettingsDraft(saved));
      onSaved(saved);
    },
  });
  const changed = hasSystemSettingsChanged(draft, current);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* columns (masonry) instead of a grid: cards of different heights stack without row gaps */}
      <div className="gap-4 @3xl:columns-2 @6xl:columns-3">
        {SYSTEM_SETTINGS_GROUPS.map((group) => (
          <section key={group.title} className="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <h3 className="border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-primary">{group.title}</h3>
            <ul className="divide-y divide-slate-100">
              {group.fields.map((f) => (
                <li key={f.key} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <label htmlFor={f.key} className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">
                      <span>{f.label}</span>
                      {f.kind === "number" && canEdit && (
                        <span className="ml-1 font-bold text-destructive" aria-hidden="true">*</span>
                      )}
                    </span>
                    <span className="block text-xs text-slate-500">{f.hint}</span>
                  </label>
                  {f.kind === "toggle" ? (
                    <button
                      id={f.key}
                      type="button"
                      role="switch"
                      aria-checked={draft[f.key]}
                      disabled={!canEdit}
                      onClick={() => setDraft({ ...draft, [f.key]: !draft[f.key] })}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${draft[f.key] ? "bg-primary" : "bg-slate-300"}`}
                    >
                      <span className={`absolute left-0 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${draft[f.key] ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  ) : (
                    <div className="flex shrink-0 items-center gap-2">
                      <Input
                        id={f.key}
                        type="number"
                        min={f.min}
                        max={f.max}
                        required
                        disabled={!canEdit}
                        className="h-9 w-24 text-right"
                        value={draft[f.key]}
                        onChange={(e) => setDraft({ ...draft, [f.key]: Math.max(f.min, Math.min(f.max, Number(e.target.value) || 0)) })}
                      />
                      <span className="w-10 text-xs text-slate-500">{f.unit}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <SystemSmtpCard
        current={current}
        draft={draft}
        canEdit={canEdit}
        hasUnsavedChanges={changed}
        defaultRecipientEmail={defaultRecipientEmail}
        onChange={setDraft}
      />

      {save.isError && <Notice tone="error">{describeError(save.error)}</Notice>}
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
        <span className="text-[11px] text-slate-500">
          {save.isSuccess && !changed ? "Đã lưu." : current.updatedAt ? `Cập nhật ${formatDateTime(current.updatedAt)}` : ""}
        </span>
        {canEdit ? (
          <Button type="submit" size="sm" disabled={!changed || save.isPending}>{save.isPending ? "Đang lưu…" : "Lưu cài đặt"}</Button>
        ) : (
          <span className="text-xs text-slate-500">Chỉ có quyền xem</span>
        )}
      </div>
    </form>
  );
}
