"use client";
import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { apiModel, SystemSettings, SystemSettingsInput } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";

const FIELDS: { key: keyof SystemSettingsInput; label: string; hint: string; max: number; unit: string }[] = [
  { key: "maxPendingApplications", label: "Đơn chờ duyệt cùng lúc", hint: "Tính trên mọi CLB · 0 = không giới hạn", max: 100, unit: "đơn" },
  { key: "reapplyCooldownDays", label: "Chờ nộp lại sau khi bị từ chối", hint: "Với CLB đã từ chối · 0 = nộp lại ngay", max: 365, unit: "ngày" },
  { key: "maxActiveClubs", label: "CLB tối đa được tham gia", hint: "Khi nộp và khi duyệt đơn · 0 = không giới hạn", max: 100, unit: "CLB" },
];

export default function SystemSettingsPage() {
  const session = useSession();
  const canView = session.can("setting.view");
  const canEdit = session.can("setting.update");
  const settings = useQuery({ queryKey: ["system-settings"], queryFn: apiModel.systemSettings, enabled: session.ready && canView });

  if (session.ready && !canView) {
    return (
      <ListPage title="Cài đặt hệ thống">
        <EmptyState icon={<Settings />} title="Bạn không có quyền xem cài đặt hệ thống" />
      </ListPage>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <BreadcrumbToolbar crumbs={[{ label: "Quản trị hệ thống" }, { label: "Cài đặt hệ thống" }]} onRefresh={() => settings.refetch()} />
      <div className="mx-auto w-full max-w-2xl space-y-3 px-4 py-5 sm:px-6">
        <p className="text-sm text-slate-600">Giới hạn khi sinh viên nộp đơn và tham gia CLB, có hiệu lực ngay.</p>
        {settings.isPending ? <LoadingRows rows={3} />
          : settings.isError ? <ErrorState message={describeError(settings.error)} onRetry={() => settings.refetch()} />
          : <SettingsForm current={settings.data} canEdit={canEdit} />}
      </div>
    </div>
  );
}

function SettingsForm({ current, canEdit }: { current: SystemSettings; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<SystemSettingsInput>({
    maxPendingApplications: current.maxPendingApplications,
    reapplyCooldownDays: current.reapplyCooldownDays,
    maxActiveClubs: current.maxActiveClubs,
  });
  const save = useMutation({
    mutationFn: () => apiModel.updateSystemSettings(draft),
    onSuccess: (saved) => queryClient.setQueryData(["system-settings"], saved),
  });
  const changed = FIELDS.some((f) => draft[f.key] !== current[f.key]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <form onSubmit={submit} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <ul className="divide-y divide-slate-100">
        {FIELDS.map((f) => (
          <li key={f.key} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <label htmlFor={f.key} className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">{f.label}</span>
              <span className="block text-xs text-slate-500">{f.hint}</span>
            </label>
            <div className="flex shrink-0 items-center gap-2">
              <Input id={f.key} type="number" min={0} max={f.max} required disabled={!canEdit} className="h-9 w-20 text-right"
                value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: Math.max(0, Math.min(f.max, Number(e.target.value) || 0)) })} />
              <span className="w-8 text-xs text-slate-500">{f.unit}</span>
            </div>
          </li>
        ))}
      </ul>
      {save.isError && <div className="px-5 pb-3"><Notice tone="error">{describeError(save.error)}</Notice></div>}
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        <span className="text-[11px] text-slate-500">
          {save.isSuccess && !changed ? "Đã lưu." : current.updatedAt ? `Cập nhật ${formatDateTime(current.updatedAt)}` : ""}
        </span>
        {canEdit
          ? <Button type="submit" size="sm" disabled={!changed || save.isPending}>{save.isPending ? "Đang lưu…" : "Lưu"}</Button>
          : <span className="text-xs text-slate-500">Chỉ có quyền xem</span>}
      </div>
    </form>
  );
}
