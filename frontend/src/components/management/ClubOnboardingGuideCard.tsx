"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Circle,
  ClipboardList,
  Layers,
  Share2,
  ShieldCheck,
} from "lucide-react";
import type { Club, Department } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GuideAction =
  | { kind: "section"; section: "profile" | "posts" | "facebook" | "appearance"; label: string }
  | { kind: "href"; href: string; label: string };

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  icon: React.ReactNode;
  action: GuideAction;
};

export function ClubOnboardingGuideCard({
  club,
  departments,
  onSelectSection,
}: {
  club: Club;
  departments: Department[];
  onSelectSection: (section: "profile" | "posts" | "facebook" | "appearance") => void;
}) {
  const profileReady = Boolean(club.description?.trim() && (club.logoUrl || club.coverUrl));
  const hasDepartments = departments.length > 0;
  const hasFacebook = Boolean(club.facebookUrl?.trim());

  const steps: OnboardingStep[] = [
    {
      id: "profile",
      title: "1. Hoàn thiện hồ sơ & nhận diện CLB",
      description: "Cập nhật tên gọi, lĩnh vực hoạt động, email liên hệ, mô tả giới thiệu, Logo và Ảnh bìa để hiển thị đẹp trên cổng khám phá CLB.",
      done: profileReady,
      icon: <Building2 size={15} />,
      action: { kind: "section", section: "profile", label: "Mở Hồ sơ CLB" },
    },
    {
      id: "departments",
      title: "2. Thiết lập các Ban chuyên môn",
      description: "Tạo các ban hoạt động (Chuyên môn, Truyền thông, Đối ngoại, Hậu cần…) để phân bổ thành viên và giao việc rõ ràng.",
      done: hasDepartments,
      icon: <Layers size={15} />,
      action: { kind: "href", href: `/management?tab=departments&clubId=${club.id}`, label: "Quản lý Ban" },
    },
    {
      id: "forms",
      title: "3. Tạo Biểu mẫu tuyển thành viên",
      description: "Soạn bộ câu hỏi ứng tuyển và mở đợt tuyển quân để sinh viên toàn trường có thể nộp đơn trực tuyến vào CLB.",
      done: false,
      icon: <ClipboardList size={15} />,
      action: { kind: "href", href: `/management?tab=forms&clubId=${club.id}`, label: "Mở Biểu mẫu" },
    },
    {
      id: "facebook",
      title: "4. Liên kết Fanpage Facebook CLB",
      description: "Đăng nhập bằng Facebook ở mục Fanpage để tự động đồng bộ bài viết và số liệu theo dõi về trang giới thiệu CLB.",
      done: hasFacebook,
      icon: <Share2 size={15} />,
      action: { kind: "section", section: "facebook", label: "Liên kết Facebook" },
    },
    {
      id: "events",
      title: "5. Tạo Sự kiện, Điểm danh QR & Cấp chứng nhận",
      description: "Tạo sự kiện mở đăng ký (Thành viên / CTV / Người tham dự), quét QR điểm danh, chốt sổ SHA-256, tải phôi ảnh riêng và cấp chứng nhận điện tử.",
      done: false,
      icon: <CalendarCheck2 size={15} />,
      action: { kind: "href", href: `/management?tab=events&clubId=${club.id}`, label: "Quản lý Sự kiện" },
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <BookOpen size={16} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">Hướng dẫn triển khai cho CLB mới ({club.code})</h3>
              <p className="text-[11px] text-muted-foreground">
                Thực hiện lần lượt 5 bước cơ bản dưới đây để đưa câu lạc bộ vào vận hành đầy đủ trên VJU ClubHub.
              </p>
            </div>
          </div>
          <Badge tone="primary" dot={false}>
            Hoàn tất {completedCount}/{steps.length} bước cấu hình cơ bản
          </Badge>
        </div>

        <ol className="mt-4 space-y-2.5">
          {steps.map((step) => (
            <li
              key={step.id}
              className={cn(
                "flex flex-col gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:justify-between",
                step.done ? "border-primary/25 bg-primary/5" : "border-border/70 bg-muted/15",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className={cn("mt-0.5 shrink-0", step.done ? "text-primary" : "text-muted-foreground")}>
                  {step.done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-primary">{step.icon}</span>
                    <p className="text-xs font-bold text-foreground">{step.title}</p>
                    {step.done && <Badge tone="primary" dot={false}>Đã thiết lập</Badge>}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>

              <div className="shrink-0">
                {(() => {
                  const action = step.action;
                  return action.kind === "section" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={step.done ? "outline" : "default"}
                      className="h-8 text-xs"
                      onClick={() => onSelectSection(action.section)}
                    >
                      {action.label}
                    </Button>
                  ) : (
                    <Link
                      href={action.href}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {action.label} <ArrowUpRight size={13} />
                    </Link>
                  );
                })()}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
          <ShieldCheck size={15} className="text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Lưu ý vận hành nhanh cho Ban Chủ nhiệm
          </h4>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3 text-xs">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="font-bold text-foreground">Phân quyền theo Ban</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
              Vào <strong>Thành viên</strong> để gán vai trò Phó CN, Trưởng ban và chỉ cấp quyền điểm danh/công việc trong phạm vi ban phụ trách.
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="font-bold text-foreground">Kho tài liệu &amp; Quỹ CLB</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
              Dùng <strong>Tài liệu CLB</strong> để lưu quy chế, kế hoạch, báo cáo tài chính (chọn mức bảo mật <em>Nội bộ BCN</em> cho tài liệu nhạy cảm).
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="flex items-center gap-1 font-bold text-foreground"><Award size={13} className="text-primary" /> Đối soát chứng nhận</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
              Sau khi chốt sổ điểm danh SHA-256 và cấp chứng nhận, theo dõi sinh viên đã xác nhận nhận cert ngay tại mục <strong>Chứng nhận</strong> trên Sidebar.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
