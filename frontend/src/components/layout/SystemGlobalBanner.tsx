"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Wrench, X } from "lucide-react";
import { apiModel } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";

export function usePublicSystemStatus() {
  return useQuery({
    queryKey: qk.publicSystemStatus(),
    queryFn: apiModel.publicSystemStatus,
    staleTime: 60_000,
    retry: false,
  });
}

export function SystemGlobalBanner({
  isAdmin,
  showPublicMaintenance = false,
}: {
  isAdmin: boolean;
  showPublicMaintenance?: boolean;
}) {
  const status = usePublicSystemStatus();
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const data = status.data;
  if (!data) return null;

  const announcementKey = `${data.announcementTone}:${data.announcementMessage ?? ""}`;
  const showAnnouncement =
    data.announcementEnabled &&
    Boolean(data.announcementMessage?.trim()) &&
    dismissedKey !== announcementKey;

  const toneClass =
    data.announcementTone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : data.announcementTone === "warning"
        ? "border-primary/25 bg-rose-50/70 text-primary"
        : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <>
      {data.maintenanceMode && (isAdmin || showPublicMaintenance) && (
        <div className="flex items-center justify-center gap-2 border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800">
          <Wrench size={13} className="shrink-0" />
          <span>
            {isAdmin
              ? "Chế độ bảo trì đang bật (người dùng thường đang tạm dừng truy cập)."
              : "Hệ thống đang bảo trì định kỳ — một số chức năng tạm thời gián đoạn."}
          </span>
        </div>
      )}
      {showAnnouncement && (
        <div
          role="status"
          className={`flex items-center justify-between gap-2 border-b px-3 py-1.5 text-xs font-medium ${toneClass}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Megaphone size={13} className="shrink-0" />
            <span className="truncate" data-no-i18n="true">
              {data.announcementMessage}
            </span>
          </div>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setDismissedKey(announcementKey)}
            className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </>
  );
}

export function MaintenanceNoticeScreen({ message }: { message?: string | null }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-50 text-primary">
          <Wrench size={22} />
        </div>
        <h2 className="mt-4 text-lg font-extrabold text-slate-900">Hệ thống đang bảo trì</h2>
        <p className="mt-2 text-sm text-slate-600" data-no-i18n={message ? "true" : undefined}>
          {message?.trim() || "VJU ClubHub đang được nâng cấp và bảo trì định kỳ. Vui lòng quay lại sau ít phút."}
        </p>
      </div>
    </div>
  );
}
