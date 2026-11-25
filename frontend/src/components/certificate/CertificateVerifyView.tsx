"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { ApiError, apiModel, describeError } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { isYouthUnionCode, participantRoleLabel } from "@/lib/club/youth-union";
import { resolveMediaUrl } from "@/lib/media";
import { formatDateTime } from "@/lib/utils";
import { LoadingRows } from "@/components/shared/States";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { openPrintableEventCertificate } from "@/utils/export/certificate-print";

export function CertificateVerifyView({ code }: { code: string }) {
  const router = useRouter();
  const normalizedCode = code.trim();
  const [searchCode, setSearchCode] = useState(normalizedCode);
  const [printing, setPrinting] = useState(false);

  const verifyQuery = useQuery({
    queryKey: qk.publicCertificateVerify(normalizedCode),
    queryFn: () => apiModel.verifyCertificate(normalizedCode),
    enabled: normalizedCode.length > 0,
    retry: false,
  });

  const handleLookupSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = searchCode.trim();
    if (!next) return;
    router.push(`/verify/${encodeURIComponent(next)}`);
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã sao chép ${label}.`);
    } catch {
      toast.error("Không thể sao chép vào bộ nhớ tạm.");
    }
  };

  const handlePrint = async () => {
    if (!verifyQuery.data) return;
    setPrinting(true);
    try {
      await openPrintableEventCertificate(verifyQuery.data);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setPrinting(false);
    }
  };

  const data = verifyQuery.data;
  const isNotFound =
    verifyQuery.isError &&
    verifyQuery.error instanceof ApiError &&
    verifyQuery.error.status === 404;
  const isYouthUnion = data ? isYouthUnionCode(data.clubCode) : false;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs font-medium sm:px-6">
          <span>Trường Đại học Việt Nhật — ĐHQGHN (VJU)</span>
          <span>Cổng xác thực Chứng nhận Điện tử công khai</span>
        </div>
      </div>

      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/home" className="flex min-w-0 items-center gap-2.5 rounded-lg">
            <Image
              src="/images/vju-logo.png"
              alt="Logo Trường Đại học Việt Nhật"
              width={36}
              height={36}
              className="size-9 shrink-0 rounded-full bg-secondary p-0.5 object-contain"
            />
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-medium text-muted-foreground">
                VJU ClubHub
              </span>
              <span className="block font-display text-sm font-extrabold tracking-tight text-foreground sm:text-base">
                VJU ClubHub · <span className="text-primary">Xác thực Chứng nhận Điện tử</span>
              </span>
            </span>
          </Link>

          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent hover:text-primary sm:text-sm"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Về trang chủ</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <form
          onSubmit={handleLookupSubmit}
          className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-2xs sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Nhập mã chứng nhận (ví dụ: VJU-CERT-2026-…)"
              aria-label="Mã chứng nhận cần xác thực"
              className="pl-9 font-mono text-xs sm:text-sm"
            />
          </div>
          <Button type="submit" size="sm" disabled={!searchCode.trim()} className="sm:w-auto">
            <Search size={14} />
            Tra cứu chứng nhận
          </Button>
        </form>

        {verifyQuery.isPending ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <LoadingRows rows={4} />
          </div>
        ) : verifyQuery.isError ? (
          <section className="rounded-2xl border border-rose-200 bg-card p-6 shadow-xs sm:p-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700">
                <ShieldX size={24} />
              </span>
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-700">
                  {isNotFound ? "KẾT QUẢ TRA CỨU" : "LỖI KẾT NỐI"}
                </p>
                <h1 className="font-serif text-2xl font-semibold text-foreground">
                  {isNotFound ? "Không tìm thấy chứng nhận" : "Không thể xác thực lúc này"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isNotFound
                    ? `Mã chứng nhận "${normalizedCode}" không tồn tại trên hệ thống VJU ClubHub. Vui lòng kiểm tra lại chính tả hoặc nhập mã khác ở ô tra cứu phía trên.`
                    : describeError(verifyQuery.error)}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {!isNotFound && (
                <Button type="button" size="sm" onClick={() => void verifyQuery.refetch()}>
                  Thử lại
                </Button>
              )}
              <Link
                href="/home"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-foreground transition-colors hover:bg-accent hover:text-primary"
              >
                <ArrowLeft size={14} />
                Về trang chủ
              </Link>
            </div>
          </section>
        ) : data ? (
          <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            {data.valid && data.status === "ISSUED" ? (
              <div className="border-b border-primary/20 bg-primary/5 px-6 py-5 sm:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-2xs">
                      <CheckCircle2 size={22} />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                        Xác thực trực tuyến VJU ClubHub
                      </p>
                      <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                        CHỨNG NHẬN HỢP LỆ
                      </h1>
                    </div>
                  </div>
                  <StatusBadge status={data.status} />
                </div>
              </div>
            ) : (
              <div className="border-b border-rose-200 bg-rose-50 px-6 py-5 sm:px-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-rose-300 bg-card text-rose-700">
                      <ShieldAlert size={22} />
                    </span>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                        Cảnh báo hiệu lực chứng nhận
                      </p>
                      <h1 className="font-serif text-2xl font-bold tracking-tight text-rose-800">
                        CHỨNG NHẬN ĐÃ BỊ THU HỒI
                      </h1>
                      {data.revokedAt && (
                        <p className="text-xs text-rose-700">
                          Thời điểm thu hồi: <span className="font-semibold">{formatDateTime(data.revokedAt)}</span>
                        </p>
                      )}
                      {data.revocationReason && (
                        <p className="text-xs text-rose-800">
                          Lý do thu hồi: <span className="font-semibold">{data.revocationReason}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={data.status} />
                </div>
              </div>
            )}

            <div className="space-y-6 p-6 sm:p-8">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Mã chứng nhận
                  </dt>
                  <dd className="mt-1 flex items-center justify-between gap-2">
                    <span className="break-all font-mono text-sm font-bold text-foreground">
                      {data.certificateCode}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => void copyText(data.certificateCode, "mã chứng nhận")}
                    >
                      <Copy size={13} />
                    </Button>
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Sinh viên được cấp
                  </dt>
                  <dd className="mt-1 text-base font-bold text-foreground">{data.recipientName}</dd>
                  <dd className="mt-0.5 font-mono text-xs text-muted-foreground">
                    MSSV: {data.studentCode || "—"}
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Vai trò tham gia
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={data.participantType} />
                    <span className="text-xs font-medium text-foreground">
                      {participantRoleLabel(data.participantType)}
                    </span>
                    {data.eventRole && <Badge tone="neutral" dot={false}>{data.eventRole}</Badge>}
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Đơn vị cấp chứng nhận
                  </dt>
                  <dd className="mt-1 space-y-1">
                    {isYouthUnion ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="primary">Đoàn TN Trường · ĐTN</Badge>
                        <span className="text-sm font-bold text-primary">
                          Đoàn Thanh niên Trường ĐH Việt Nhật
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-foreground">{data.clubName}</span>
                        <Badge tone="neutral" dot={false}>{data.clubCode}</Badge>
                      </div>
                    )}
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 sm:col-span-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Sự kiện / Hoạt động
                  </dt>
                  <dd className="mt-1 text-base font-bold text-foreground">{data.eventTitle}</dd>
                  <dd className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Thời gian: {formatDateTime(data.eventStartTime)}</span>
                    <span>Học kỳ: {data.academicTerm || "—"}</span>
                    <span>Ngày cấp: {formatDateTime(data.issuedAt)}</span>
                    {data.acknowledgedAt && (
                      <span className="font-semibold text-primary">
                        Sinh viên đã xác nhận nhận: {formatDateTime(data.acknowledgedAt)}
                      </span>
                    )}
                  </dd>
                </div>

                {resolveMediaUrl(data.templateImageUrl) && (
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 sm:col-span-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Phôi chứng nhận của đơn vị phát hành
                    </dt>
                    <dd className="mt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveMediaUrl(data.templateImageUrl)!}
                        alt={`Phôi chứng nhận ${data.clubName}`}
                        className="max-h-56 w-full rounded-lg border border-border object-contain bg-card"
                      />
                    </dd>
                  </div>
                )}

                <div className="rounded-xl border border-border/70 bg-secondary/40 p-3.5 sm:col-span-2">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <ShieldCheck size={13} className="text-primary" />
                    Mã băm xác thực toàn vẹn (SHA-256)
                  </dt>
                  <dd className="mt-1.5 flex items-center gap-2">
                    <code
                      title={data.verificationSha256}
                      className="block min-w-0 flex-1 truncate whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-foreground"
                    >
                      {data.verificationSha256}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 px-2.5 text-xs"
                      onClick={() => void copyText(data.verificationSha256, "mã băm SHA-256")}
                    >
                      <Copy size={12} />
                      Sao chép
                    </Button>
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" disabled={printing} onClick={() => void handlePrint()}>
                    <Printer size={14} />
                    {printing ? "Đang tạo bản in…" : "In / Lưu PDF"}
                  </Button>
                  <Link
                    href="/home"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-foreground transition-colors hover:bg-accent hover:text-primary"
                  >
                    <ArrowLeft size={14} />
                    Về trang chủ
                  </Link>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Xác thực trực tiếp từ cơ sở dữ liệu VJU ClubHub
                </span>
              </div>
            </div>
          </article>
        ) : null}
      </main>
    </div>
  );
}
