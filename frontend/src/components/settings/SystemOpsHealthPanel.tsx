"use client";

import { useQuery } from "@tanstack/react-query";
import {
  HardDrive,
  Megaphone,
  RefreshCw,
  Server,
  Wrench,
} from "lucide-react";
import { apiModel, type SystemSettingsInput } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { formatBytesCompact } from "@/forms/club/club-overview-config";
import { describeError } from "@/components/shared/ListPage";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { formatTime } from "@/lib/utils";

interface SystemOpsHealthPanelProps {
  draft: SystemSettingsInput;
  canEdit: boolean;
  onChange: (next: SystemSettingsInput) => void;
}

function statusTone(status: string): Tone {
  if (status === "UP") return "success";
  if (status === "DOWN") return "danger";
  if (status === "PAUSED") return "pending";
  return "neutral";
}

function statusLabel(status: string): string {
  if (status === "UP") return "Trực tuyến";
  if (status === "DOWN") return "Mất kết nối";
  if (status === "PAUSED") return "Tạm tắt";
  return "Chưa cấu hình";
}

function toLocalDateTimeInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SystemOpsHealthPanel({
  draft,
  canEdit,
  onChange,
}: SystemOpsHealthPanelProps) {
  const health = useQuery({
    queryKey: qk.systemInfraHealth(),
    queryFn: apiModel.systemInfraHealth,
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-3.5">
      {/* Row 1: Live Infrastructure Health & Storage */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2">
          <div className="flex items-center gap-2">
            <Server size={14} className="text-primary" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Trạng thái hạ tầng & Lưu trữ
            </h3>
            {health.data?.checkedAt && (
              <span className="font-mono text-[11px] text-slate-400" data-no-i18n="true">
                {formatTime(health.data.checkedAt)}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7.5"
            disabled={health.isFetching}
            onClick={() => health.refetch()}
          >
            <RefreshCw size={12} className={health.isFetching ? "animate-spin" : ""} />
            Làm mới
          </Button>
        </div>

        <div className="space-y-3 p-4">
          {health.isPending ? (
            <LoadingRows rows={2} />
          ) : health.isError ? (
            <ErrorState message={describeError(health.error)} onRetry={() => health.refetch()} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-6">
                {health.data.services.map((svc) => (
                  <div
                    key={svc.key}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-bold text-slate-900" data-no-i18n="true">
                        {svc.name}
                      </span>
                      {svc.latencyMs !== null && (
                        <span className="font-mono text-[10.5px] text-slate-500" data-no-i18n="true">
                          {svc.latencyMs}ms
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      <Badge tone={statusTone(svc.status)}>{statusLabel(svc.status)}</Badge>
                    </div>
                    {svc.detail && (
                      <p
                        className="mt-1 truncate font-mono text-[10.5px] text-slate-400"
                        title={svc.detail}
                        data-no-i18n="true"
                      >
                        {svc.detail}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3 md:grid-cols-5">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <HardDrive size={14} className="shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10.5px] text-slate-500">Tổng lưu trữ</p>
                    <p className="font-mono text-xs font-bold text-slate-900" data-no-i18n="true">
                      {formatBytesCompact(health.data.storage.totalBytes)}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[10.5px] text-slate-500">Kho tài liệu</p>
                  <p className="font-mono text-xs font-bold text-slate-900" data-no-i18n="true">
                    {formatBytesCompact(health.data.storage.documentBytes)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[10.5px] text-slate-500">Media Chat</p>
                  <p className="font-mono text-xs font-bold text-slate-900" data-no-i18n="true">
                    {formatBytesCompact(health.data.storage.chatMediaBytes)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[10.5px] text-slate-500">Câu lạc bộ</p>
                  <p className="font-mono text-xs font-bold text-slate-900" data-no-i18n="true">
                    {health.data.storage.clubCount}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[10.5px] text-slate-500">Tài khoản hoạt động</p>
                  <p className="font-mono text-xs font-bold text-slate-900" data-no-i18n="true">
                    {health.data.storage.activeUsers} / {health.data.storage.totalUsers}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Row 2: Maintenance Mode | Global Announcement Banner side-by-side */}
      <div className="grid gap-3.5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2">
            <div className="flex items-center gap-2">
              <Wrench size={14} className="text-primary" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Chế độ bảo trì
              </h3>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <span>{draft.maintenanceMode ? "Đang bật" : "Đang tắt"}</span>
              <button
                type="button"
                role="switch"
                aria-label="Chế độ bảo trì"
                aria-checked={draft.maintenanceMode}
                disabled={!canEdit}
                onClick={() => onChange({ ...draft, maintenanceMode: !draft.maintenanceMode })}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                  draft.maintenanceMode ? "bg-primary" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute left-0 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
                    draft.maintenanceMode ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
          </div>
          <div className="p-4">
            <FormField label="Thông báo bảo trì">
              <Input
                maxLength={500}
                disabled={!canEdit}
                value={draft.maintenanceMessage ?? ""}
                onChange={(e) => onChange({ ...draft, maintenanceMessage: e.target.value })}
                placeholder="Hệ thống đang bảo trì định kỳ, vui lòng quay lại sau ít phút."
                className="h-9 text-xs"
              />
            </FormField>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2">
            <div className="flex items-center gap-2">
              <Megaphone size={14} className="text-primary" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Banner thông báo toàn trường
              </h3>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <span>{draft.announcementEnabled ? "Đang bật" : "Đang tắt"}</span>
              <button
                type="button"
                role="switch"
                aria-label="Banner thông báo toàn trường"
                aria-checked={draft.announcementEnabled}
                disabled={!canEdit}
                onClick={() =>
                  onChange({ ...draft, announcementEnabled: !draft.announcementEnabled })
                }
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                  draft.announcementEnabled ? "bg-primary" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute left-0 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
                    draft.announcementEnabled ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
          </div>
          <div className="space-y-3 p-4">
            <FormField label="Nội dung thông báo">
              <Input
                maxLength={500}
                disabled={!canEdit}
                value={draft.announcementMessage ?? ""}
                onChange={(e) => onChange({ ...draft, announcementMessage: e.target.value })}
                placeholder="VD: Đợt tuyển thành viên CLB học kỳ mới mở đến 30/11!"
                className="h-9 text-xs"
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Mức độ hiển thị">
                <Select
                  disabled={!canEdit}
                  value={draft.announcementTone}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      announcementTone: e.target.value as "info" | "warning" | "danger",
                    })
                  }
                  className="h-8.5 text-xs"
                >
                  <option value="info">Thông tin</option>
                  <option value="warning">Lưu ý</option>
                  <option value="danger">Khẩn cấp</option>
                </Select>
              </FormField>
              <FormField label="Tự ẩn lúc">
                <Input
                  type="datetime-local"
                  max="2099-12-31T23:59"
                  disabled={!canEdit}
                  value={toLocalDateTimeInput(draft.announcementExpiresAt)}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({
                      ...draft,
                      announcementExpiresAt: v ? new Date(v).toISOString() : null,
                    });
                  }}
                  className="h-8.5 font-mono text-xs"
                />
              </FormField>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
