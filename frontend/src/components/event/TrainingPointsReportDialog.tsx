"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, FilterX, Lock, Search, ShieldCheck, X } from "lucide-react";
import { apiModel, type Club } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { describeError } from "@/components/shared/ListPage";
import { ExportReportMenu } from "@/components/shared/ExportReportMenu";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { Badge, CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  buildAcademicTermOptions,
  collectReportSignatures,
  exportTrainingPointsReport,
  extractItemSignatures,
} from "@/utils/export/training-points-report";

const OFFICER_KEYS = ["event.attendance", "event.attendance_edit", "event.update"];

export function TrainingPointsReportDialog({
  open,
  onClose,
  clubs,
  initialClubId,
}: {
  open: boolean;
  onClose: () => void;
  clubs: Club[];
  initialClubId?: string;
}) {
  const session = useOptionalSession();

  const permittedClubs = useMemo(() => {
    const hasGlobalAccess =
      session.hasGlobal("user.view") || OFFICER_KEYS.some((k) => session.hasGlobal(k));
    const isDoanVjuOfficer = clubs.some(
      (c) =>
        c.code?.toUpperCase() === "DOANVJU" &&
        OFFICER_KEYS.some((k) => session.canInClub(k, c.id))
    );
    if (hasGlobalAccess || isDoanVjuOfficer) {
      return clubs;
    }
    return clubs.filter((c) => OFFICER_KEYS.some((k) => session.canInClub(k, c.id)));
  }, [clubs, session]);

  const canCrossUnit = useMemo(() => {
    const hasGlobalAccess =
      session.hasGlobal("user.view") || OFFICER_KEYS.some((k) => session.hasGlobal(k));
    const isDoanVjuOfficer = clubs.some(
      (c) =>
        c.code?.toUpperCase() === "DOANVJU" &&
        OFFICER_KEYS.some((k) => session.canInClub(k, c.id))
    );
    return hasGlobalAccess || isDoanVjuOfficer;
  }, [clubs, session]);

  const defaultClubId = useMemo(() => {
    if (initialClubId && permittedClubs.some((c) => c.id === initialClubId)) {
      return initialClubId;
    }
    if (!canCrossUnit && permittedClubs.length === 1) {
      return permittedClubs[0].id;
    }
    return "";
  }, [initialClubId, permittedClubs, canCrossUnit]);

  const [clubIdOverride, setClubIdOverride] = useState<string | null>(null);
  const [academicTerm, setAcademicTerm] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const clubId = clubIdOverride ?? defaultClubId;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const termOptions = useMemo(() => buildAcademicTermOptions(), []);
  const isValidRange = !fromDate || !toDate || fromDate <= toDate;
  const fromIso = fromDate ? `${fromDate}T00:00:00+07:00` : undefined;
  const toIso = toDate ? `${toDate}T23:59:59+07:00` : undefined;

  const reportQuery = useQuery({
    queryKey: qk.trainingPointsReport(
      clubId || "all",
      academicTerm || "all",
      search.trim(),
      fromDate,
      toDate
    ),
    queryFn: () =>
      apiModel.trainingPointsReport({
        clubId: clubId || undefined,
        academicTerm: academicTerm || undefined,
        search: search.trim() || undefined,
        from: fromIso,
        to: toIso,
      }),
    enabled: open && isValidRange,
  });

  if (!open) return null;

  const data = reportQuery.data;
  const signatures = data ? collectReportSignatures(data) : [];
  const hasFilters = Boolean(clubId !== defaultClubId || academicTerm || search.trim() || fromDate || toDate);

  const resetFilters = () => {
    setClubIdOverride(null);
    setAcademicTerm("");
    setSearch("");
    setFromDate("");
    setToDate("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 fade-in"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Báo cáo minh chứng Điểm rèn luyện"
        onMouseDown={(e) => e.stopPropagation()}
        className="panel-modal flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Award size={16} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold text-slate-900">
                Báo cáo minh chứng Điểm rèn luyện
              </h3>
              <p className="truncate text-xs text-muted-foreground">
                Tổng hợp lượt có mặt hợp lệ theo học kỳ và mã xác thực khoá sổ SHA-256
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-3 border-b border-border/70 bg-slate-50/80 px-4 py-3 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
          <Select
            aria-label="Đơn vị / Câu lạc bộ"
            value={clubId}
            onChange={(e) => setClubIdOverride(e.target.value)}
            className="h-9 text-xs"
          >
            {(canCrossUnit || permittedClubs.length > 1) && (
              <option value="">
                {canCrossUnit ? "Tất cả 13 đơn vị / CLB" : "Tất cả CLB được phân quyền"}
              </option>
            )}
            {permittedClubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code === "DOANVJU" ? `Đoàn TN VJU (${c.name})` : `${c.code} · ${c.name}`}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Học kỳ"
            value={academicTerm}
            onChange={(e) => setAcademicTerm(e.target.value)}
            className="h-9 text-xs"
          >
            <option value="">Tất cả học kỳ</option>
            {termOptions.map((term) => (
              <option key={term} value={term}>
                Học kỳ {term}
              </option>
            ))}
          </Select>

          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tên, MSSV, email…"
              aria-label="Tìm sinh viên theo tên, mã sinh viên hoặc email"
              className="h-9 pl-8 text-xs"
            />
          </div>

          <Input
            type="date"
            aria-label="Từ ngày"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 text-xs"
          />

          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="Đến ngày"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 flex-1 text-xs"
            />
            {hasFilters && (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={resetFilters}
                title="Đặt lại bộ lọc"
                aria-label="Đặt lại bộ lọc"
                className="h-9 w-9 shrink-0"
              >
                <FilterX size={14} />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {!isValidRange && (
            <Notice tone="error">
              Khoảng thời gian không hợp lệ: ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.
            </Notice>
          )}

          {data && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-card px-3 py-2.5">
                <p className="text-[11px] font-medium text-muted-foreground">Đơn vị phạm vi</p>
                <p className="mt-0.5 truncate text-xs font-bold text-slate-900">
                  {data.clubName || "Tất cả đơn vị"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-card px-3 py-2.5">
                <p className="text-[11px] font-medium text-muted-foreground">Sinh viên đạt minh chứng</p>
                <p className="mt-0.5 font-mono text-base font-bold text-slate-900">
                  {data.totalStudents}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-card px-3 py-2.5">
                <p className="text-[11px] font-medium text-muted-foreground">Tổng lượt có mặt</p>
                <p className="mt-0.5 font-mono text-base font-bold text-primary">
                  {data.totalPresentCheckIns}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-card px-3 py-2.5">
                <p className="text-[11px] font-medium text-muted-foreground">Chứng thực SHA-256</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {signatures.length > 0 ? (
                    <Badge tone="primary">
                      <ShieldCheck size={11} /> {signatures.length} chữ ký khoá sổ
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Chưa khoá sổ</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {!isValidRange ? null : reportQuery.isPending ? (
            <LoadingRows />
          ) : reportQuery.isError ? (
            <ErrorState
              message={describeError(reportQuery.error)}
              onRetry={() => reportQuery.refetch()}
            />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={<Award />}
              title="Chưa có dữ liệu điểm rèn luyện khớp bộ lọc"
              description="Chỉ các lượt điểm danh Có mặt / Đi muộn tại sự kiện đã công bố hoặc hoàn thành mới được tổng hợp."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-card">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                    <th className="w-12 px-3 py-2.5 text-center">STT</th>
                    <th className="px-3 py-2.5">Sinh viên</th>
                    <th className="px-3 py-2.5">CLB tham gia</th>
                    <th className="w-24 px-3 py-2.5 text-center">Số buổi</th>
                    <th className="px-3 py-2.5">Sự kiện minh chứng &amp; Xác thực</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {data.items.map((item, idx) => {
                    const itemSigs = extractItemSignatures(item);
                    return (
                      <tr key={item.userId} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-bold text-slate-900">{item.fullName}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {item.studentCode || "Chưa có MSSV"} · {item.email}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {item.activeClubs.length ? item.activeClubs.join(", ") : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <CountBadge>{item.presentEventCount}</CountBadge>
                        </td>
                        <td className="px-3 py-2.5">
                          {item.attendedEvents && item.attendedEvents.length > 0 ? (
                            <ul className="space-y-1">
                              {item.attendedEvents.map((ev) => (
                                <li
                                  key={ev.eventId}
                                  className="flex flex-wrap items-center gap-1.5 text-[11px]"
                                >
                                  <span className="font-semibold text-slate-800">{ev.title}</span>
                                  {ev.academicTerm && (
                                    <Badge tone="neutral" dot={false}>
                                      {ev.academicTerm}
                                    </Badge>
                                  )}
                                  {ev.attendanceSignatureSha256 && (
                                    <Badge tone="primary" dot={false}>
                                      <Lock size={10} /> {ev.attendanceSignatureSha256.slice(0, 10)}…
                                    </Badge>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-slate-700">
                                {item.attendedEventTitles.join("; ") || "—"}
                              </p>
                              {itemSigs.length > 0 && (
                                <Badge tone="primary" dot={false}>
                                  <Lock size={10} /> {itemSigs[0].slice(0, 12)}…
                                </Badge>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-slate-50/70 px-4 py-3 sm:px-6">
          <span className="text-[11px] text-muted-foreground">
            Xuất Excel (.csv UTF-8 BOM) hoặc bản in A4 chuẩn Phòng CTSV VJU
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <ExportReportMenu
              disabled={!data || reportQuery.isPending || !isValidRange}
              onExport={(mode) => exportTrainingPointsReport(mode, data!)}
            />
            <Button type="button" size="sm" variant="outline" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
