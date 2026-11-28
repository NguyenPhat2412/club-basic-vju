"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Award, CheckCircle2, Clock, ExternalLink, Mail, Printer, Search } from "lucide-react";
import { apiModel, describeError, type CertificateStatus, type EventCertificate } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { isYouthUnionCode } from "@/lib/club/youth-union";
import { useSession } from "@/hooks/useSession";
import { cn, formatDateTime } from "@/lib/utils";
import { SvgDonutChart, type DonutSegment } from "@/components/dashboard/DashboardSvgPrimitives";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterPopover } from "@/components/shared/FilterPopover";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { openPrintableEventCertificate } from "@/utils/export/certificate-print";

function formatShortDate(raw?: string | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function ClubCertificatesOverviewSection({
  clubId,
  clubCode,
  mode = "page",
  canViewAllUnits = false,
  initialSearch = "",
}: {
  clubId?: string;
  clubCode?: string;
  mode?: "page" | "summary";
  canViewAllUnits?: boolean;
  initialSearch?: string;
}) {
  const qc = useQueryClient();
  const session = useSession();
  const [scopeAll, setScopeAll] = useState(!clubId);
  const [search, setSearch] = useState(initialSearch);
  const [academicTerm, setAcademicTerm] = useState("");
  const [status, setStatus] = useState<CertificateStatus | "">("");
  const [ackFilter, setAckFilter] = useState<"" | "true" | "false">("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [remindingCertId, setRemindingCertId] = useState<string | null>(null);

  const effectiveClubId = mode === "page" && canViewAllUnits && scopeAll ? undefined : clubId;
  const acknowledgedParam = ackFilter === "" ? undefined : ackFilter === "true";

  const certQuery = useQuery({
    queryKey: qk.managementCertificates(effectiveClubId ?? "ALL", mode, academicTerm, status, ackFilter, search.trim(), offset, limit),
    queryFn: () =>
      apiModel.managementCertificates({
        clubId: effectiveClubId,
        academicTerm: academicTerm.trim() || undefined,
        status: status || undefined,
        acknowledged: acknowledgedParam,
        search: search.trim() || undefined,
        offset: mode === "summary" ? 0 : offset,
        limit: mode === "summary" ? 1 : limit,
      }),
    placeholderData: keepPreviousData,
  });

  const remindMutation = useMutation({
    mutationFn: ({ eventId, certificateId }: { eventId: string; certificateId: string }) =>
      apiModel.remindEventCertificates(eventId, { certificateIds: [certificateId] }),
    onMutate: ({ certificateId }) => setRemindingCertId(certificateId),
    onSuccess: (res) => {
      toast.success(
        res.smtpConfigured
          ? `Đã gửi nhắc xác nhận (${res.remindedCount}) & Email (${res.emailedCount}).`
          : `Đã gửi nhắc xác nhận trong hệ thống (${res.remindedCount}).`,
      );
      void qc.invalidateQueries({ queryKey: qk.managementCertificates() });
      void qc.invalidateQueries({ queryKey: qk.eventCertificates(res.eventId) });
    },
    onError: (err) => toast.error(describeError(err)),
    onSettled: () => setRemindingCertId(null),
  });

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

  const activeFilterCount = (academicTerm.trim() ? 1 : 0) + (status ? 1 : 0) + (ackFilter ? 1 : 0);
  const clearFilters = () => {
    setAcademicTerm("");
    setStatus("");
    setAckFilter("");
    setOffset(0);
  };

  const summary = certQuery.data?.summary;
  const items = certQuery.data?.items ?? [];
  const total = certQuery.data?.total ?? 0;

  const donutSegments: DonutSegment[] = useMemo(
    () => [
      { key: "ack", label: "Đã xác nhận", value: summary?.acknowledgedCount ?? 0, strokeClass: "stroke-primary", dotClass: "bg-primary" },
      { key: "pending", label: "Chờ xác nhận", value: summary?.pendingAcknowledgeCount ?? 0, strokeClass: "stroke-slate-400", dotClass: "bg-slate-400" },
      { key: "revoked", label: "Đã thu hồi", value: summary?.revokedCount ?? 0, strokeClass: "stroke-rose-300", dotClass: "bg-rose-300" },
    ],
    [summary],
  );

  if (mode === "summary") {
    const fullListHref = clubId ? `/management?tab=certificates&clubId=${clubId}` : "/management?tab=certificates";
    return (
      <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Award size={15} />
            </span>
            <h3 className="truncate text-xs font-bold uppercase tracking-wider text-foreground">
              {clubId ? "Thống kê Chứng nhận CLB" : "Thống kê Chứng nhận toàn hệ thống (13 đơn vị)"}
            </h3>
            {summary && <CountBadge>{summary.totalCertificates}</CountBadge>}
          </div>
          <Link
            href={fullListHref}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-white px-2.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            Xem danh sách đầy đủ <ArrowUpRight size={13} />
          </Link>
        </div>
        <div className="p-4">
          {certQuery.isPending ? (
            <LoadingRows rows={2} />
          ) : certQuery.isError ? (
            <ErrorState message={describeError(certQuery.error)} onRetry={() => certQuery.refetch()} />
          ) : summary ? (
            <div className="grid items-center gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <SvgDonutChart segments={donutSegments} centerValue={`${summary.acknowledgementRate}%`} centerLabel="Đã nhận" size={116} strokeWidth={16} />
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <MiniStat label="Đã cấp" value={summary.issuedCount} />
                <MiniStat label="Đã nhận" value={summary.acknowledgedCount} accent />
                <MiniStat label="Chờ nhận" value={summary.pendingAcknowledgeCount} />
                <MiniStat label="Thu hồi" value={summary.revokedCount} />
              </div>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  const columns: Column<EventCertificate>[] = [
    {
      key: "recipientName",
      header: "Họ và tên",
      className: "max-w-[140px] font-semibold text-foreground",
      sortValue: (c) => c.recipientName,
      render: (c) => <span className="block truncate" title={c.recipientName}>{c.recipientName}</span>,
    },
    {
      key: "studentCode",
      header: "MSSV",
      className: "whitespace-nowrap font-mono text-xs text-muted-foreground",
      sortValue: (c) => c.studentCode ?? "",
      render: (c) => c.studentCode || "—",
    },
    {
      key: "certificateCode",
      header: "Mã cert",
      className: "max-w-[145px] font-mono text-xs font-semibold text-foreground",
      sortValue: (c) => c.certificateCode,
      render: (c) => <span className="block truncate" title={c.certificateCode}>{c.certificateCode}</span>,
    },
    ...(!effectiveClubId
      ? ([{
          key: "clubCode",
          header: "Đơn vị",
          className: "whitespace-nowrap",
          sortValue: (c) => c.clubCode,
          render: (c) => <Badge tone={isYouthUnionCode(c.clubCode) ? "primary" : "neutral"} dot={false}>{c.clubCode}</Badge>,
        }] as Column<EventCertificate>[])
      : []),
    {
      key: "eventTitle",
      header: "Sự kiện",
      className: "max-w-[155px]",
      sortValue: (c) => c.eventTitle,
      render: (c) => <span className="block truncate text-foreground" title={c.eventTitle}>{c.eventTitle}</span>,
    },
    {
      key: "participantType",
      header: "Vai trò",
      className: "whitespace-nowrap",
      sortValue: (c) => c.participantType,
      render: (c) => <StatusBadge status={c.participantType} />,
    },
    {
      key: "academicTerm",
      header: "Kỳ",
      className: "whitespace-nowrap font-mono text-xs text-muted-foreground",
      sortValue: (c) => c.academicTerm ?? "",
      render: (c) => c.academicTerm || "—",
    },
    {
      key: "issuedAt",
      header: "Ngày cấp",
      className: "whitespace-nowrap font-mono text-xs text-muted-foreground",
      sortValue: (c) => c.issuedAt,
      render: (c) => <span title={formatDateTime(c.issuedAt)}>{formatShortDate(c.issuedAt)}</span>,
    },
    {
      key: "ack",
      header: "Xác nhận",
      className: "whitespace-nowrap",
      sortValue: (c) => (c.status === "REVOKED" ? 0 : c.acknowledgedAt ? 2 : 1),
      render: (c) => {
        if (c.status === "REVOKED") return <StatusBadge status="REVOKED" />;
        if (c.acknowledgedAt) {
          return (
            <span title={`Xác nhận lúc ${formatDateTime(c.acknowledgedAt)}`}>
              <Badge tone="primary" dot={false}><CheckCircle2 size={11} /> Đã nhận</Badge>
            </span>
          );
        }
        return (
          <span title={(c.reminderCount ?? 0) > 0 ? `Đã nhắc ${c.reminderCount} lần` : "Sinh viên chưa xác nhận"}>
            <Badge tone="neutral" dot={false}>
              <Clock size={11} /> Chờ{(c.reminderCount ?? 0) > 0 ? ` (${c.reminderCount})` : ""}
            </Badge>
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Thao tác",
      className: "whitespace-nowrap text-right",
      render: (c) => {
        const canRemind = c.status === "ISSUED" && !c.acknowledgedAt && session.canInClub("certificate.issue", c.clubId);
        const isReminding = remindingCertId === c.id && remindMutation.isPending;
        return (
          <div className="flex items-center justify-end gap-0.5">
            {canRemind && (
              <Button type="button" size="sm" variant="ghost" className="size-7 p-0 text-primary hover:bg-primary/10" disabled={isReminding} onClick={() => remindMutation.mutate({ eventId: c.eventId, certificateId: c.id })} title="Nhắc xác nhận qua hệ thống & Email" aria-label="Nhắc xác nhận qua Email">
                <Mail size={13} />
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" className="size-7 p-0" disabled={printingId === c.id} onClick={() => void handlePrint(c)} title="Tải / In PDF" aria-label="Tải hoặc in PDF">
              <Printer size={13} />
            </Button>
            <Link href={`/verify/${encodeURIComponent(c.certificateCode)}`} target="_blank" rel="noopener noreferrer" className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary" title="Trang xác thực QR công khai" aria-label="Trang xác thực QR">
              <ExternalLink size={13} />
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border bg-white px-3 py-1.5 sm:px-4">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:w-auto sm:flex-1">
          {clubCode && !scopeAll && <Badge tone="primary" dot={false}>{clubCode}</Badge>}
          {canViewAllUnits && clubId && (
            <div className="inline-flex h-8 items-center rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Phạm vi thống kê chứng nhận">
              <button type="button" onClick={() => { setScopeAll(false); setOffset(0); }} className={cn("h-full rounded-md px-2.5 text-xs font-semibold transition-colors", !scopeAll ? "bg-white text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground")}>
                {clubCode || "CLB hiện tại"}
              </button>
              <button type="button" onClick={() => { setScopeAll(true); setOffset(0); }} className={cn("h-full rounded-md px-2.5 text-xs font-semibold transition-colors", scopeAll ? "bg-white text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground")}>
                Toàn trường (13 đơn vị)
              </button>
            </div>
          )}
          <div className="relative min-w-0 flex-1 sm:max-w-[260px]">
            <Search size={13} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} maxLength={80} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder="Tìm tên, MSSV, mã cert, sự kiện…" className="h-8 pl-8 text-xs" />
          </div>
          <FilterPopover activeCount={activeFilterCount} onClear={clearFilters} title="Lọc danh sách chứng nhận">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">Học kỳ</label>
              <Input value={academicTerm} maxLength={16} onChange={(e) => { setAcademicTerm(e.target.value); setOffset(0); }} placeholder="VD: 2026-1" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">Xác nhận nhận cert</label>
              <Select value={ackFilter} onChange={(e) => { setAckFilter(e.target.value as "" | "true" | "false"); setOffset(0); }} className="h-8 text-xs">
                <option value="">Tất cả</option>
                <option value="true">Đã xác nhận</option>
                <option value="false">Chờ xác nhận</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">Trạng thái</label>
              <Select value={status} onChange={(e) => { setStatus(e.target.value as CertificateStatus | ""); setOffset(0); }} className="h-8 text-xs">
                <option value="">Tất cả</option>
                <option value="ISSUED">Hợp lệ</option>
                <option value="REVOKED">Đã thu hồi</option>
              </Select>
            </div>
          </FilterPopover>
        </div>

        {summary && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <Badge tone="neutral" dot={false}>Đã cấp: <strong className="font-mono">{summary.issuedCount}</strong></Badge>
            <Badge tone="primary" dot={false}>Đã nhận: <strong className="font-mono">{summary.acknowledgedCount} ({summary.acknowledgementRate}%)</strong></Badge>
            <Badge tone="neutral" dot={false}>Chờ: <strong className="font-mono">{summary.pendingAcknowledgeCount}</strong></Badge>
          </div>
        )}
      </div>

      {certQuery.isPending ? (
        <LoadingRows rows={6} />
      ) : certQuery.isError ? (
        <ErrorState message={describeError(certQuery.error)} onRetry={() => certQuery.refetch()} />
      ) : !items.length ? (
        <EmptyState icon={<Award />} title="Chưa có chứng nhận nào" description="Không có bản ghi phù hợp với bộ lọc hiện tại." />
      ) : (
        <>
          <DataTable ariaLabel="Danh sách sinh viên được cấp chứng nhận" columns={columns} rows={items} rowKey={(row) => row.id} />
          <Pagination offset={offset} limit={limit} total={total} onOffset={setOffset} onLimit={setLimit} />
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={accent ? "rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5" : "rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5"}>
      <p className={accent ? "text-[11px] font-medium text-primary" : "text-[11px] text-muted-foreground"}>{label}</p>
      <p className={accent ? "mt-0.5 font-mono text-lg font-extrabold tabular-nums text-primary" : "mt-0.5 font-mono text-lg font-extrabold tabular-nums text-foreground"}>{value}</p>
    </div>
  );
}
