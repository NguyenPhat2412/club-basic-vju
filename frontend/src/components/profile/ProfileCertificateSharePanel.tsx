"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Eye, Link2, Plus, Trash2 } from "lucide-react";
import { apiModel, describeError } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

export function ProfileCertificateSharePanel({
  availableTerms,
}: {
  availableTerms: string[];
}) {
  const qc = useQueryClient();
  const [academicTerm, setAcademicTerm] = useState("");
  const [title, setTitle] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const linksQuery = useQuery({
    queryKey: qk.myCertificateShareLinks(),
    queryFn: () => apiModel.myCertificateShareLinks(),
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiModel.createCertificateShareLink({
        academicTerm: academicTerm || null,
        title: title.trim() || null,
        expiresInDays: expiresInDays ? Number(expiresInDays) : null,
      }),
    onSuccess: (created) => {
      setTitle("");
      void qc.invalidateQueries({ queryKey: qk.myCertificateShareLinks() });
      toast.success("Đã tạo liên kết chia sẻ hồ sơ minh chứng ĐRL.");
      if (typeof window !== "undefined") {
        const url = `${window.location.origin}/verify/proof/${created.token}`;
        void navigator.clipboard?.writeText(url).catch(() => undefined);
      }
    },
    onError: (err) => toast.error(describeError(err)),
  });

  const revokeMut = useMutation({
    mutationFn: (linkId: string) => apiModel.revokeCertificateShareLink(linkId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.myCertificateShareLinks() });
      toast.success("Đã thu hồi liên kết chia sẻ minh chứng.");
    },
    onError: (err) => toast.error(describeError(err)),
  });

  const copyLink = async (id: string, token: string) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/verify/proof/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success("Đã sao chép đường link hồ sơ minh chứng.");
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
    } catch {
      toast.error("Không thể sao chép đường link.");
    }
  };

  const links = linksQuery.data?.items ?? [];

  return (
    <div className="space-y-3 rounded-xl border border-primary/25 bg-rose-50/35 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 size={14} className="text-primary" />
          <h4 className="text-xs font-bold text-foreground">
            Chia sẻ link Hồ sơ minh chứng ĐRL (cho Lớp phó / Cố vấn / CTSV)
          </h4>
        </div>
        <Badge tone="primary" dot={false}>Xác thực công khai</Badge>
      </div>

      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        Tạo đường link xác thực trực tiếp từ máy chủ VJU ClubHub để nộp khi chấm điểm rèn luyện. Bạn có thể giới hạn theo học kỳ, đặt hạn dùng và thu hồi bất cứ lúc nào.
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        <Select
          aria-label="Chọn học kỳ minh chứng"
          value={academicTerm}
          onChange={(e) => setAcademicTerm(e.target.value)}
          className="h-8.5 text-xs"
        >
          <option value="">Tất cả học kỳ</option>
          {availableTerms.map((term) => (
            <option key={term} value={term}>
              Học kỳ {term}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Thời hạn liên kết"
          value={expiresInDays}
          onChange={(e) => setExpiresInDays(e.target.value)}
          className="h-8.5 text-xs"
        >
          <option value="7">Hết hạn sau 7 ngày</option>
          <option value="30">Hết hạn sau 30 ngày</option>
          <option value="90">Hết hạn sau 90 ngày</option>
          <option value="">Không giới hạn thời gian</option>
        </Select>

        <Input
          aria-label="Tiêu đề hồ sơ minh chứng"
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề (VD: Hồ sơ ĐRL HK1)…"
          className="h-8.5 text-xs"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs"
          disabled={createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          <Plus size={13} />
          <span>{createMut.isPending ? "Đang tạo…" : "Tạo link minh chứng"}</span>
        </Button>
      </div>

      {links.length > 0 && (
        <ul className="space-y-2 border-t border-border/60 pt-2.5">
          {links.slice(0, 6).map((link) => {
            const href = `/verify/proof/${encodeURIComponent(link.token)}`;
            const isCopied = copiedId === link.id;
            return (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-semibold text-foreground" data-no-i18n="true">
                      {link.title || (link.academicTerm ? `Minh chứng học kỳ ${link.academicTerm}` : "Hồ sơ minh chứng toàn bộ")}
                    </span>
                    <Badge tone={link.active ? "primary" : "neutral"} dot={false}>
                      {link.active ? "Đang mở" : link.revokedAt ? "Đã thu hồi" : "Hết hạn"}
                    </Badge>
                    {link.academicTerm && <Badge tone="neutral" dot={false}>{link.academicTerm}</Badge>}
                  </div>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Eye size={11} /> {link.viewCount} lượt xem
                    </span>
                    <span>
                      {link.expiresAt ? `Hết hạn: ${formatDateTime(link.expiresAt)}` : "Không giới hạn"}
                    </span>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {link.active && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => void copyLink(link.id, link.token)}
                      >
                        {isCopied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                        <span>{isCopied ? "Đã chép" : "Sao chép"}</span>
                      </Button>
                      <Link
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground hover:border-primary/40 hover:text-primary"
                      >
                        <ExternalLink size={12} /> Mở
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px] text-destructive hover:border-destructive/40"
                        disabled={revokeMut.isPending}
                        onClick={() => confirm("Thu hồi liên kết chia sẻ minh chứng này?") && revokeMut.mutate(link.id)}
                        aria-label="Thu hồi liên kết"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
