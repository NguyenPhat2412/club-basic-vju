"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Printer,
  Search,
  ShieldAlert,
} from "lucide-react";
import { apiModel, describeError, type EventCertificate } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { isYouthUnionCode, participantRoleLabel } from "@/lib/club/youth-union";
import { cn, formatDateTime } from "@/lib/utils";
import { ProfileCertificateSharePanel } from "@/components/profile/ProfileCertificateSharePanel";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { openPrintableEventCertificate } from "@/utils/export/certificate-print";

type AckFilter = "all" | "pending" | "acknowledged";

export function ProfileCertificatesCard() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<AckFilter>("all");
  const [search, setSearch] = useState("");
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const certificatesQuery = useQuery({
    queryKey: qk.myCertificates(),
    queryFn: () => apiModel.myCertificates(),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (certificateId: string) => apiModel.acknowledgeMyCertificate(certificateId),
    onMutate: (certificateId) => {
      setAcknowledgingId(certificateId);
    },
    onSuccess: (updated) => {
      toast.success(`Đã xác nhận nhận chứng nhận ${updated.certificateCode}.`);
      void qc.invalidateQueries({ queryKey: qk.myCertificates() });
      void qc.invalidateQueries({ queryKey: qk.eventCertificates(updated.eventId) });
      void qc.invalidateQueries({ queryKey: qk.managementCertificates() });
      void qc.invalidateQueries({ queryKey: qk.clubStatistics() });
    },
    onError: (err) => {
      toast.error(describeError(err));
    },
    onSettled: () => {
      setAcknowledgingId(null);
    },
  });

  const allItems = useMemo(() => certificatesQuery.data?.items ?? [], [certificatesQuery.data?.items]);
  const availableTerms = useMemo(
    () =>
      Array.from(
        new Set(allItems.map((c) => c.academicTerm?.trim()).filter((t): t is string => Boolean(t))),
      ).sort((a, b) => b.localeCompare(a)),
    [allItems],
  );

  const counts = useMemo(() => {
    let issued = 0;
    let acknowledged = 0;
    let pending = 0;
    for (const item of allItems) {
      if (item.status === "ISSUED") {
        issued += 1;
        if (item.acknowledgedAt) acknowledged += 1;
        else pending += 1;
      }
    }
    return { total: allItems.length, issued, acknowledged, pending };
  }, [allItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (filter === "pending" && (item.status !== "ISSUED" || Boolean(item.acknowledgedAt))) {
        return false;
      }
      if (filter === "acknowledged" && !item.acknowledgedAt) {
        return false;
      }
      if (!q) return true;
      return (
        item.eventTitle.toLowerCase().includes(q) ||
        item.clubName.toLowerCase().includes(q) ||
        item.clubCode.toLowerCase().includes(q) ||
        item.certificateCode.toLowerCase().includes(q)
      );
    });
  }, [allItems, filter, search]);

  const handlePrint = async (cert: EventCertificate) => {
    setPrintingId(cert.id);
    try {
      await openPrintableEventCertificate(cert);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Award size={16} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-bold text-foreground">Chứng nhận của tôi</h3>
              {!certificatesQuery.isPending && !certificatesQuery.isError && (
                <CountBadge>{counts.total}</CountBadge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Xác nhận đã nhận chứng nhận điện tử trực tiếp trên hệ thống để CLB &amp; Đoàn trường thống kê.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {counts.pending > 0 && (
            <Badge tone="primary" dot={false}>
              {counts.pending} chờ xác nhận
            </Badge>
          )}
          <Button
            type="button"
            size="sm"
            variant={shareOpen ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => setShareOpen((v) => !v)}
          >
            <Link2 size={13} />
            <span>Chia sẻ minh chứng ĐRL</span>
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {shareOpen && <ProfileCertificateSharePanel availableTerms={availableTerms} />}
        {certificatesQuery.isPending ? (
          <LoadingRows rows={2} />
        ) : certificatesQuery.isError ? (
          <ErrorState
            message={describeError(certificatesQuery.error)}
            onRetry={() => certificatesQuery.refetch()}
          />
        ) : allItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
            <Award size={20} className="mx-auto text-primary/70" />
            <p className="mt-2 text-xs font-semibold text-foreground">Bạn chưa có chứng nhận điện tử nào</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Khi CLB hoặc Đoàn trường cấp chứng nhận sau sự kiện, chứng nhận sẽ xuất hiện tại đây để bạn xác nhận và tải PDF.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
                <p className="text-[10.5px] font-medium text-muted-foreground">Tổng chứng nhận</p>
                <p className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-foreground">
                  {counts.total}
                </p>
              </div>
              <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
                <p className="text-[10.5px] font-medium text-primary">Đã xác nhận</p>
                <p className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-primary">
                  {counts.acknowledged}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
                <p className="text-[10.5px] font-medium text-muted-foreground">Chờ xác nhận</p>
                <p className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-foreground">
                  {counts.pending}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex h-8 items-center rounded-lg border border-border bg-muted/40 p-0.5">
                {(
                  [
                    { key: "all", label: `Tất cả (${counts.total})` },
                    { key: "pending", label: `Chờ xác nhận (${counts.pending})` },
                    { key: "acknowledged", label: `Đã nhận (${counts.acknowledged})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilter(tab.key)}
                    className={cn(
                      "h-full rounded-md px-2.5 text-[11px] font-semibold transition-colors",
                      filter === tab.key
                        ? "bg-card text-primary shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="relative min-w-0 flex-1 sm:max-w-[230px]">
                <Search
                  size={13}
                  className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={search}
                  maxLength={80}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm sự kiện, CLB, mã cert…"
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
                Không có chứng nhận nào khớp bộ lọc hiện tại.
              </p>
            ) : (
              <ul className={cn("space-y-2.5", filteredItems.length > 4 && "max-h-[460px] overflow-y-auto pr-1")}>
                {filteredItems.map((cert) => {
                  const isYouthUnion = isYouthUnionCode(cert.clubCode);
                  const isIssued = cert.status === "ISSUED";
                  const isAcknowledged = Boolean(cert.acknowledgedAt);
                  const isBusyAck = acknowledgingId === cert.id && acknowledgeMutation.isPending;

                  return (
                    <li
                      key={cert.id}
                      className={cn(
                        "space-y-2.5 rounded-xl border p-3.5 text-xs transition-colors",
                        isIssued && !isAcknowledged
                          ? "border-primary/35 bg-primary/5"
                          : "border-border/70 bg-muted/15",
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone={isYouthUnion ? "primary" : "neutral"} dot={false}>
                              {isYouthUnion ? "Đoàn TN · DOANVJU" : cert.clubCode}
                            </Badge>
                            {cert.academicTerm && (
                              <Badge tone="neutral" dot={false}>
                                {cert.academicTerm}
                              </Badge>
                            )}
                            {cert.templateImageUrl && (
                              <Badge tone="neutral" dot={false}>
                                <ImageIcon size={10} /> Phôi CLB
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-bold text-foreground">{cert.eventTitle}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {cert.clubName} · Cấp ngày {formatDateTime(cert.issuedAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          <StatusBadge status={cert.participantType} />
                          <StatusBadge status={cert.status} />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-[11px]">
                        <span className="font-mono font-semibold text-foreground">{cert.certificateCode}</span>
                        <span className="text-muted-foreground">
                          Vai trò: <strong className="text-foreground">{participantRoleLabel(cert.participantType)}</strong>
                          {cert.eventRole ? ` · ${cert.eventRole}` : ""}
                        </span>
                      </div>

                      {cert.status === "REVOKED" && cert.revocationReason && (
                        <div className="flex items-start gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700">
                          <ShieldAlert size={13} className="mt-0.5 shrink-0" />
                          <span>Đã thu hồi: {cert.revocationReason}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isIssued && !isAcknowledged && (
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 px-2.5 text-xs"
                              disabled={isBusyAck}
                              onClick={() => acknowledgeMutation.mutate(cert.id)}
                            >
                              <CheckCircle2 size={13} />
                              {isBusyAck ? "Đang xác nhận…" : "Xác nhận đã nhận"}
                            </Button>
                          )}
                          {isIssued && isAcknowledged && cert.acknowledgedAt && (
                            <span className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-2.5 text-[11px] font-semibold text-primary">
                              <CheckCircle2 size={12} />
                              Đã xác nhận · {formatDateTime(cert.acknowledgedAt)}
                            </span>
                          )}
                          {!isIssued && (
                            <span className="inline-flex h-7 items-center gap-1 text-[11px] text-rose-700">
                              <Clock size={12} /> Không còn hiệu lực
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px]"
                            disabled={printingId === cert.id}
                            onClick={() => void handlePrint(cert)}
                          >
                            <Printer size={12} />
                            {printingId === cert.id ? "Đang mở…" : "Tải / In PDF"}
                          </Button>
                          <Link
                            href={`/verify/${encodeURIComponent(cert.certificateCode)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary"
                          >
                            <ExternalLink size={12} />
                            Xác thực QR
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
