"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Copy,
  ExternalLink,
  Printer,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { ApiError, apiModel, describeError } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { isYouthUnionCode, participantRoleLabel } from "@/lib/club/youth-union";
import { formatDateTime } from "@/lib/utils";
import { LoadingRows } from "@/components/shared/States";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function CertificateProofVerifyView({ token }: { token: string }) {
  const normalizedToken = token.trim();

  const proofQuery = useQuery({
    queryKey: qk.publicCertificateProof(normalizedToken),
    queryFn: () => apiModel.resolveCertificateProof(normalizedToken),
    enabled: normalizedToken.length > 0,
    retry: false,
  });

  const copyCurrentUrl = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép đường link hồ sơ minh chứng.");
    } catch {
      toast.error("Không thể sao chép đường link.");
    }
  };

  const data = proofQuery.data;
  const isNotFound =
    proofQuery.isError &&
    proofQuery.error instanceof ApiError &&
    proofQuery.error.status === 404;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-primary text-primary-foreground print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs font-medium sm:px-6">
          <span>Trường Đại học Việt Nhật — ĐHQGHN (VJU)</span>
          <span>Cổng xác thực Hồ sơ minh chứng ĐRL công khai</span>
        </div>
      </div>

      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-xs print:static">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
                Hồ sơ minh chứng <span className="text-primary">Chứng nhận &amp; Hoạt động</span>
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2 print:hidden">
            {data?.active && (
              <>
                <Button type="button" size="sm" variant="outline" onClick={() => void copyCurrentUrl()}>
                  <Copy size={13} /> Sao chép link
                </Button>
                <Button type="button" size="sm" onClick={() => window.print()}>
                  <Printer size={13} /> In / Lưu PDF A4
                </Button>
              </>
            )}
            <Link
              href="/home"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-secondary px-3 text-xs font-semibold text-foreground transition-colors hover:bg-accent hover:text-primary"
            >
              <ArrowLeft size={13} /> Về trang chủ
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {proofQuery.isPending ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <LoadingRows rows={4} />
          </div>
        ) : proofQuery.isError ? (
          <section className="rounded-2xl border border-rose-200 bg-card p-6 shadow-xs">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700">
                <ShieldX size={22} />
              </span>
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-700">
                  {isNotFound ? "LIÊN KẾT KHÔNG TỒN TẠI" : "LỖI KẾT NỐI"}
                </p>
                <h1 className="font-serif text-xl font-semibold text-foreground">
                  {isNotFound ? "Không tìm thấy hồ sơ minh chứng" : "Không thể tải hồ sơ minh chứng"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isNotFound
                    ? "Đường dẫn xác thực không hợp lệ hoặc đã bị xoá. Vui lòng yêu cầu sinh viên gửi lại đường link mới từ VJU ClubHub."
                    : describeError(proofQuery.error)}
                </p>
              </div>
            </div>
          </section>
        ) : data && !data.active ? (
          <section className="rounded-2xl border border-rose-200 bg-card p-6 shadow-xs">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700">
                <ShieldAlert size={22} />
              </span>
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-700">
                  LIÊN KẾT KHÔNG CÒN HIỆU LỰC
                </p>
                <h1 className="font-serif text-xl font-semibold text-foreground">
                  {data.revoked ? "Liên kết minh chứng đã bị thu hồi" : "Liên kết minh chứng đã hết hạn"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Để bảo vệ quyền riêng tư của sinh viên, thông tin chứng nhận chỉ hiển thị khi liên kết còn hiệu lực.
                </p>
              </div>
            </div>
          </section>
        ) : data ? (
          <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="border-b border-primary/20 bg-primary/5 px-5 py-5 sm:px-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-2xs">
                    <CheckCircle2 size={22} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Xác thực trực tuyến VJU ClubHub
                    </p>
                    <h1 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl" data-no-i18n="true">
                      {data.title || "HỒ SƠ MINH CHỨNG CHỨNG NHẬN HOẠT ĐỘNG"}
                    </h1>
                  </div>
                </div>
                <Badge tone="primary" dot={false}>
                  <ShieldCheck size={12} /> Minh chứng hợp lệ
                </Badge>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Sinh viên được xác thực
                  </p>
                  <p className="mt-1 text-base font-bold text-foreground" data-no-i18n="true">
                    {data.studentName || "—"}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    MSSV: {data.studentCode || "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Chứng nhận hợp lệ
                  </p>
                  <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-primary">
                    {data.issuedCount}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {data.academicTerm ? `Học kỳ ${data.academicTerm}` : "Toàn bộ học kỳ"}
                  </p>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Thông tin đối soát
                  </p>
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    Xác thực: {formatDateTime(data.verifiedAt)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {data.expiresAt ? `Hết hạn: ${formatDateTime(data.expiresAt)}` : "Không giới hạn hạn dùng"}
                  </p>
                </div>
              </div>

              {data.items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                  <Award size={22} className="mx-auto text-primary/70" />
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    Chưa có chứng nhận nào trong phạm vi học kỳ này
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="border-b border-border bg-muted/35 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3.5 py-2.5 font-bold">Sự kiện &amp; Đơn vị cấp</th>
                        <th className="px-3.5 py-2.5 font-bold">Vai trò</th>
                        <th className="px-3.5 py-2.5 font-bold">Học kỳ / Ngày cấp</th>
                        <th className="px-3.5 py-2.5 font-bold">Mã xác thực &amp; SHA-256</th>
                        <th className="px-3.5 py-2.5 font-bold">Trạng thái</th>
                        <th className="px-3.5 py-2.5 text-right font-bold print:hidden">Tra cứu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {data.items.map((item) => {
                        const isDtn = isYouthUnionCode(item.clubCode);
                        return (
                          <tr key={item.certificateCode} className="align-top">
                            <td className="px-3.5 py-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge tone={isDtn ? "primary" : "neutral"} dot={false}>
                                  {isDtn ? "Đoàn TN · DOANVJU" : item.clubCode}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground" data-no-i18n="true">
                                  {item.clubName}
                                </span>
                              </div>
                              <p className="mt-1 font-bold text-foreground" data-no-i18n="true">
                                {item.eventTitle}
                              </p>
                            </td>
                            <td className="px-3.5 py-3">
                              <StatusBadge status={item.participantType} />
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {participantRoleLabel(item.participantType)}
                                {item.eventRole ? ` · ${item.eventRole}` : ""}
                              </p>
                            </td>
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <p className="font-semibold text-foreground">{item.academicTerm || "—"}</p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {item.issuedAt ? formatDateTime(item.issuedAt) : "—"}
                              </p>
                            </td>
                            <td className="px-3.5 py-3">
                              <code className="font-mono text-[11px] font-bold text-foreground">
                                {item.certificateCode}
                              </code>
                              <p
                                title={item.verificationSha256}
                                className="mt-0.5 font-mono text-[10px] text-muted-foreground"
                              >
                                SHA-256: {item.verificationSha256.slice(0, 16)}…
                              </p>
                            </td>
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <StatusBadge status={item.status} />
                              {item.status === "REVOKED" && item.revocationReason && (
                                <p className="mt-1 max-w-[180px] text-[10.5px] text-rose-700" data-no-i18n="true">
                                  {item.revocationReason}
                                </p>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-right whitespace-nowrap print:hidden">
                              <Link
                                href={`/verify/${encodeURIComponent(item.certificateCode)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-semibold text-primary hover:border-primary/40"
                              >
                                <ExternalLink size={11} /> Chi tiết
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                <span>
                  Dữ liệu được đối chiếu trực tiếp từ hệ thống quản trị VJU ClubHub (chống chỉnh sửa).
                </span>
                <span>Tổng lượt kiểm tra: {data.viewCount}</span>
              </div>
            </div>
          </article>
        ) : null}
      </main>
    </div>
  );
}
