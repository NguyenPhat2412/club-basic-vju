"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Award, Mail } from "lucide-react";
import { apiModel, ClubEvent } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { EventCertificateTemplateBox } from "@/components/event/EventCertificateTemplateBox";
import { describeError } from "@/components/shared/ListPage";
import { Section } from "@/components/shared/Overlays";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { Badge, CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type EventCertificatesSectionProps = {
  event: ClubEvent;
  canView: boolean;
  canIssue: boolean;
  canManageTemplate: boolean;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
};

export function EventCertificatesSection({
  event,
  canView,
  canIssue,
  canManageTemplate,
  onNotice,
  onError,
}: EventCertificatesSectionProps) {
  const qc = useQueryClient();
  const isLocked = Boolean(event.attendanceLockedAt);
  const canAccessSection = canView || canIssue || canManageTemplate;

  const certificatesQuery = useQuery({
    queryKey: qk.eventCertificates(event.id),
    queryFn: () => apiModel.eventCertificates(event.id),
    enabled: canAccessSection && isLocked,
  });

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: qk.eventCertificates(event.id) });
    void qc.invalidateQueries({ queryKey: qk.myCertificates() });
    void qc.invalidateQueries({ queryKey: qk.managementCertificates() });
    void qc.invalidateQueries({ queryKey: qk.clubEvents() });
    void qc.invalidateQueries({ queryKey: qk.clubStatistics() });
  };

  const issueMutation = useMutation({
    mutationFn: () => apiModel.issueEventCertificates(event.id),
    onSuccess: (res) => {
      onError("");
      onNotice(
        res.issuedCount > 0
          ? `Đã phát hành ${res.issuedCount} chứng nhận mới và gửi thông báo tới sinh viên.`
          : `Tất cả người tham gia đủ điều kiện đã có chứng nhận (${res.totalCertificates}).`,
      );
      invalidateAll();
    },
    onError: (err) => onError(describeError(err)),
  });

  const remindMutation = useMutation({
    mutationFn: () => apiModel.remindEventCertificates(event.id, {}),
    onSuccess: (res) => {
      onError("");
      onNotice(
        res.remindedCount === 0
          ? "Tất cả sinh viên đã xác nhận nhận chứng nhận."
          : res.smtpConfigured
            ? `Đã gửi nhắc xác nhận (${res.remindedCount}) & Email (${res.emailedCount}).`
            : `Đã gửi nhắc xác nhận trong hệ thống cho ${res.remindedCount} người (Email SMTP chưa bật).`,
      );
      invalidateAll();
    },
    onError: (err) => onError(describeError(err)),
  });

  if (!canAccessSection || event.status === "DRAFT" || event.status === "CANCELLED") return null;

  const items = certificatesQuery.data?.items ?? [];
  const issuedItems = items.filter((c) => c.status === "ISSUED");
  const acknowledgedCount = issuedItems.filter((c) => Boolean(c.acknowledgedAt)).length;
  const pendingAckCount = issuedItems.length - acknowledgedCount;
  const tableHref = `/management?tab=certificates&clubId=${event.clubId}&search=${encodeURIComponent(event.title)}`;

  return (
    <Section title="Chứng nhận điện tử (e-Certificate)" icon={<Award />}>
      <div className="space-y-3">
        {canManageTemplate && (
          <EventCertificateTemplateBox
            eventId={event.id}
            initialTemplateUrl={event.certificateTemplateUrl}
            onChanged={invalidateAll}
            onNotice={onNotice}
            onError={onError}
          />
        )}

        {!isLocked ? (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
            Cần chốt &amp; ký khoá sổ điểm danh SHA-256 ở trên trước khi phát hành chứng nhận.
          </div>
        ) : certificatesQuery.isPending ? (
          <LoadingRows rows={1} />
        ) : certificatesQuery.isError ? (
          <ErrorState message={describeError(certificatesQuery.error)} onRetry={() => certificatesQuery.refetch()} />
        ) : (
          <div className="space-y-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-foreground">Tổng đã cấp:</span>
                <CountBadge>{items.length}</CountBadge>
                {issuedItems.length > 0 && (
                  <>
                    <Badge tone="primary" dot={false}>Đã nhận {acknowledgedCount}/{issuedItems.length}</Badge>
                    {pendingAckCount > 0 && <Badge tone="neutral" dot={false}>Chờ {pendingAckCount}</Badge>}
                  </>
                )}
              </div>
              <Link
                href={tableHref}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                Mở bảng chứng nhận <ArrowUpRight size={13} />
              </Link>
            </div>

            {canIssue && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Button type="button" size="sm" disabled={issueMutation.isPending} onClick={() => issueMutation.mutate()}>
                  <Award size={14} />
                  {issueMutation.isPending ? "Đang phát hành…" : "Phát hành chứng nhận"}
                </Button>
                {pendingAckCount > 0 && (
                  <Button type="button" size="sm" variant="outline" disabled={remindMutation.isPending} onClick={() => remindMutation.mutate()}>
                    <Mail size={13} />
                    {remindMutation.isPending ? "Đang gửi nhắc…" : `Nhắc xác nhận qua Email (${pendingAckCount})`}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}
