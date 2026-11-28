"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, FileText, Mail, RefreshCw } from "lucide-react";
import { apiModel, type NotificationCampaign } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { describeError } from "@/components/shared/ListPage";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { NotificationCampaignComposer } from "./NotificationCampaignComposer";

function audienceLabel(type: string): string {
  if (type === "ALL_USERS") return "Toàn hệ thống";
  if (type === "CLUB_LEADERS") return "Ban Chủ nhiệm CLB";
  if (type === "CLUBS") return "CLB đã chọn";
  return type;
}

function categoryLabel(category: string): string {
  if (category === "DOCUMENT") return "Hồ sơ & Công văn";
  if (category === "ANNOUNCEMENT") return "Thông báo chung";
  return "Hệ thống";
}

export function NotificationCampaignsPanel({ hasGlobalSend }: { hasGlobalSend: boolean }) {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(15);

  const campaigns = useQuery({
    queryKey: qk.notificationCampaigns(offset, limit),
    queryFn: () => apiModel.notificationCampaigns(offset, limit),
    placeholderData: keepPreviousData,
  });

  const remindMut = useMutation({
    mutationFn: (campaignId: string) => apiModel.remindUnreadCampaign(campaignId),
    onSuccess: (res) => {
      if (res.remindedCount === 0) {
        toast.success("Tất cả người nhận đã đọc thông báo này.");
      } else {
        toast.success(`Đã gửi nhắc đọc tới ${res.remindedCount} người chưa đọc.`);
      }
      queryClient.invalidateQueries({ queryKey: qk.notificationCampaigns() });
    },
    onError: (err) => toast.error(describeError(err)),
  });

  const items = campaigns.data?.items ?? [];

  return (
    <div className="space-y-3.5 px-3 py-3 sm:px-5">
      <NotificationCampaignComposer
        hasGlobalSend={hasGlobalSend}
        onSent={() => setOffset(0)}
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2">
          <div className="flex items-center gap-2">
            <BellRing size={14} className="text-primary" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Lịch sử đợt phát thông báo & Tỷ lệ đã đọc
            </h3>
            <Badge tone="neutral">
              <span data-no-i18n="true">{campaigns.data?.total ?? 0}</span>
            </Badge>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7.5"
            disabled={campaigns.isFetching}
            onClick={() => campaigns.refetch()}
          >
            <RefreshCw size={12} className={campaigns.isFetching ? "animate-spin" : ""} />
            Làm mới
          </Button>
        </div>

        {campaigns.isPending ? (
          <LoadingRows rows={3} />
        ) : campaigns.isError ? (
          <ErrorState message={describeError(campaigns.error)} onRetry={() => campaigns.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<BellRing />}
            title="Chưa có đợt phát thông báo nào"
            description="Sử dụng biểu mẫu phía trên để phát thông báo hàng loạt tới toàn hệ thống hoặc Ban Chủ nhiệm các CLB."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-[10.5px] uppercase text-slate-500">
                <tr>
                  <th className="px-3.5 py-2 font-semibold">Thời gian</th>
                  <th className="px-3.5 py-2 font-semibold">Tiêu đề & Tài liệu</th>
                  <th className="px-3.5 py-2 font-semibold">Đối tượng</th>
                  <th className="px-3.5 py-2 font-semibold">Kênh gửi</th>
                  <th className="px-3.5 py-2 font-semibold">Tiến độ đã đọc</th>
                  <th className="px-3.5 py-2 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c: NotificationCampaign) => {
                  const pct =
                    c.totalRecipients > 0
                      ? Math.min(100, Math.round((c.readCount / c.totalRecipients) * 100))
                      : 100;
                  const unreadLeft = Math.max(0, c.totalRecipients - c.readCount);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-[11px] text-slate-600">
                        <div data-no-i18n="true">{formatDateTime(c.createdAt)}</div>
                        {c.createdByName && (
                          <div className="text-[10.5px] text-slate-400" data-no-i18n="true">
                            {c.createdByName}
                          </div>
                        )}
                      </td>
                      <td className="max-w-[300px] px-3.5 py-2.5">
                        <p className="truncate font-semibold text-slate-900" data-no-i18n="true" title={c.title}>
                          {c.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge tone={c.category === "DOCUMENT" ? "primary" : "neutral"} dot={false}>
                            {categoryLabel(c.category)}
                          </Badge>
                          {c.documentTitle && (
                            <span
                              className="inline-flex items-center gap-1 truncate text-[10.5px] text-slate-500"
                              data-no-i18n="true"
                            >
                              <FileText size={11} className="shrink-0 text-primary" />
                              {c.documentTitle}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5">
                        <Badge tone="neutral">{audienceLabel(c.audienceType)}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5">
                        <div className="flex items-center gap-1">
                          <Badge tone="success" dot={false}>In-app</Badge>
                          {c.sendEmail && (
                            <Badge tone="primary" dot={false}>
                              <Mail size={10} />
                              <span data-no-i18n="true">{c.emailQueuedCount}</span>
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="min-w-[150px] px-3.5 py-2.5">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="font-semibold text-slate-800" data-no-i18n="true">
                            {c.readCount}/{c.totalRecipients}
                          </span>
                          <span className="text-slate-500" data-no-i18n="true">
                            {pct}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-right">
                        {unreadLeft > 0 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            disabled={remindMut.isPending}
                            onClick={() => remindMut.mutate(c.id)}
                          >
                            <BellRing size={12} />
                            Nhắc chưa đọc
                          </Button>
                        ) : (
                          <Badge tone="success">Đã đọc đủ</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {(campaigns.data?.total ?? 0) > 0 && (
          <Pagination
            offset={offset}
            limit={limit}
            total={campaigns.data?.total ?? 0}
            onOffset={setOffset}
            onLimit={setLimit}
          />
        )}
      </section>
    </div>
  );
}
