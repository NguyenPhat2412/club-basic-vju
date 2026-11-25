"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Award, CalendarDays, Clock, Compass, ShieldCheck } from "lucide-react";
import { apiModel, describeError, EventCertificate } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { cn, formatDateTime } from "@/lib/utils";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { openPrintableEventCertificate } from "@/utils/export/certificate-print";

export function ProfileEventsCard() {
  const router = useRouter();
  const [printingCertId, setPrintingCertId] = useState<string | null>(null);

  const eventsQuery = useQuery({
    queryKey: qk.myEventRegistrations("profile"),
    queryFn: () => apiModel.myEventRegistrations({ limit: 20 }),
  });

  const certificatesQuery = useQuery({
    queryKey: qk.myCertificates(),
    queryFn: () => apiModel.myCertificates(),
  });

  const certByEventId = useMemo(() => {
    const map = new Map<string, EventCertificate>();
    for (const cert of certificatesQuery.data?.items ?? []) {
      const existing = map.get(cert.eventId);
      if (!existing || (existing.status !== "ISSUED" && cert.status === "ISSUED")) {
        map.set(cert.eventId, cert);
      }
    }
    return map;
  }, [certificatesQuery.data?.items]);

  const items = eventsQuery.data?.items ?? [];
  const totalCount = eventsQuery.data?.total ?? items.length;

  const handleDownloadCertificate = async (cert: EventCertificate) => {
    setPrintingCertId(cert.id);
    try {
      await openPrintableEventCertificate(cert);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setPrintingCertId(null);
    }
  };

  return (
    <section className="@container min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5 @4xl:p-6">
      <div className="flex flex-col gap-3 border-b border-border pb-4 @sm:flex-row @sm:items-center @sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-primary/5 text-primary">
            <CalendarDays size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">SỰ KIỆN & ĐIỂM DANH</p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="truncate text-lg font-bold tracking-tight sm:text-xl">Sự kiện của tôi</h2>
              {!eventsQuery.isPending && !eventsQuery.isError && <CountBadge>{totalCount}</CountBadge>}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full shrink-0 @sm:w-auto"
          onClick={() => router.push("/events")}
        >
          Cổng sự kiện
          <ArrowUpRight size={14} />
        </Button>
      </div>

      <div className="mt-4">
        {eventsQuery.isPending ? (
          <LoadingRows rows={2} />
        ) : eventsQuery.isError ? (
          <ErrorState message={describeError(eventsQuery.error)} onRetry={() => eventsQuery.refetch()} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center">
            <span className="grid size-12 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Compass size={22} />
            </span>
            <div className="max-w-sm">
              <p className="text-sm font-bold text-foreground">Bạn chưa đăng ký sự kiện nào</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Khám phá các hoạt động câu lạc bộ tại VJU để đăng ký tham gia hoặc làm cộng tác viên sự kiện.
              </p>
            </div>
            <Button size="sm" onClick={() => router.push("/events")}>
              <Compass size={14} />
              Khám phá sự kiện
            </Button>
          </div>
        ) : (
          <ul
            className={cn(
              "flex flex-col gap-2.5",
              items.length > 5 && "max-h-[430px] overflow-y-auto pr-1",
            )}
          >
            {items.map((item) => {
              const cert = certByEventId.get(item.eventId);
              return (
                <li key={item.registrationId} className="min-w-0">
                  <div className="group flex min-w-0 flex-col gap-2 overflow-hidden rounded-xl border border-border/70 bg-muted/15 p-3 transition-colors hover:border-primary/35 hover:bg-muted/35">
                    <Link href={`/events?eventId=${item.eventId}`} className="flex min-w-0 flex-col gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-sm font-bold text-foreground group-hover:text-primary">
                            {item.eventTitle}
                          </span>
                          <Badge tone="primary" dot={false} className="shrink-0">
                            {item.clubCode}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{item.clubName}</p>
                        <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                          <Clock size={12} className="shrink-0" />
                          <span className="font-mono font-semibold text-foreground">{formatDateTime(item.startTime)}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={item.participantType} />
                        <StatusBadge status={item.registrationStatus} />
                        {item.attendanceStatus && <StatusBadge status={item.attendanceStatus} />}
                        {item.eventRole && <Badge tone="neutral">{item.eventRole}</Badge>}
                        {cert && <StatusBadge status={cert.status} />}
                      </div>
                    </Link>

                    {cert && cert.status === "ISSUED" && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[11px]"
                          disabled={printingCertId === cert.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDownloadCertificate(cert);
                          }}
                        >
                          <Award size={12} />
                          {printingCertId === cert.id ? "Đang mở…" : "Tải Chứng nhận"}
                        </Button>
                        <Link
                          href={`/verify/${encodeURIComponent(cert.certificateCode)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary"
                        >
                          <ShieldCheck size={12} />
                          Xác thực
                        </Link>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
