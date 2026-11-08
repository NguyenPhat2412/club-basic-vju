"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ClipboardList,
  Lock,
  LockOpen,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { apiModel, Club } from "@/lib/api";
import { clubSlugFromCode } from "@/lib/media";
import { ClubAvatar, ClubCoverBanner, useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { describeError } from "@/components/shared/ListPage";
import { EmptyState } from "@/components/shared/States";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ClubManagementTabKey } from "@/forms/club/club-form";

interface ClubsDirectoryTabProps {
  clubs: Club[];
  activeClubId: string;
  canCreateClub: boolean;
  canInClub: (permissionKey: string, clubId: string) => boolean;
  onSelectClubAndTab: (clubId: string, tab: ClubManagementTabKey) => void;
  onOpenCreateClub: () => void;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}

export function ClubsDirectoryTab({
  clubs,
  activeClubId,
  canCreateClub,
  canInClub,
  onSelectClubAndTab,
  onOpenCreateClub,
  onNotice,
  onError,
}: ClubsDirectoryTabProps) {
  const queryClient = useQueryClient();
  const mediaCatalog = useClubMediaCatalog(true);

  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "ACTIVE" | "INACTIVE">("");

  const activityFields = useMemo(() => {
    const set = new Set<string>();
    clubs.forEach((c) => {
      if (c.activityField?.trim()) {
        set.add(c.activityField.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [clubs]);

  const filteredClubs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clubs.filter((club) => {
      if (statusFilter && club.status !== statusFilter) return false;
      if (fieldFilter && (club.activityField ?? "").trim() !== fieldFilter) return false;
      if (!q) return true;
      return (
        club.name.toLowerCase().includes(q) ||
        club.code.toLowerCase().includes(q) ||
        (club.activityField ?? "").toLowerCase().includes(q) ||
        (club.contactEmail ?? "").toLowerCase().includes(q) ||
        (club.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [clubs, search, fieldFilter, statusFilter]);

  const activeCount = useMemo(() => clubs.filter((c) => c.status === "ACTIVE").length, [clubs]);
  const inactiveCount = clubs.length - activeCount;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      apiModel.updateClubStatus(id, status),
    onSuccess: (updated) => {
      onNotice(
        updated.status === "ACTIVE"
          ? `Đã kích hoạt câu lạc bộ "${updated.name}" (${updated.code}).`
          : `Đã tạm ngừng hoạt động câu lạc bộ "${updated.name}" (${updated.code}).`,
      );
      onError("");
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      queryClient.invalidateQueries({ queryKey: ["home", "public-clubs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "public-clubs"] });
    },
    onError: (err) => onError(describeError(err)),
  });

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-background/60 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tổng số CLB quản lý
          </p>
          <p className="mt-1 text-2xl font-extrabold text-foreground tabular-nums">{clubs.length}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Đồng bộ trực tiếp từ cơ sở dữ liệu PostgreSQL
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/60 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Đang hoạt động
          </p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {activeCount}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Hiển thị công khai trên Trang chủ & Khám phá CLB
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/60 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Lĩnh vực & Trạng thái khác
          </p>
          <p className="mt-1 text-2xl font-extrabold text-primary tabular-nums">
            {activityFields.length} lĩnh vực · {inactiveCount} tạm ngừng
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Chọn CLB bên dưới để điều phối nhân sự, sự kiện và biểu mẫu
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-background/50 p-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã, tên CLB, lĩnh vực, email…"
              className="h-9 pl-8 text-xs"
            />
          </div>

          <Select
            aria-label="Lọc lĩnh vực"
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            className="h-9 w-full text-xs sm:w-52"
          >
            <option value="">Tất cả lĩnh vực ({activityFields.length})</option>
            {activityFields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Lọc trạng thái CLB"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | "ACTIVE" | "INACTIVE")}
            className="h-9 w-full text-xs sm:w-44"
          >
            <option value="">Mọi trạng thái ({clubs.length})</option>
            <option value="ACTIVE">Đang hoạt động ({activeCount})</option>
            <option value="INACTIVE">Ngừng hoạt động ({inactiveCount})</option>
          </Select>
        </div>

        {canCreateClub && (
          <Button size="sm" onClick={onOpenCreateClub}>
            <Plus size={14} /> Thành lập CLB mới
          </Button>
        )}
      </div>

      {filteredClubs.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="Không tìm thấy câu lạc bộ phù hợp"
          description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái để xem đầy đủ danh sách CLB."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredClubs.map((club) => {
            const isSelected = club.id === activeClubId;
            const slug = clubSlugFromCode(club.code);
            const fallbackMedia = mediaCatalog.data?.clubs[slug];
            const canActivate = club.status !== "ACTIVE" && canInClub("club.active", club.id);
            const canDeactivate = club.status === "ACTIVE" && canInClub("club.inactive", club.id);
            const canEditSettings =
              canInClub("club.update", club.id) || canActivate || canDeactivate || canInClub("notification.send", club.id);

            return (
              <article
                key={club.id}
                className={`flex flex-col justify-between overflow-hidden rounded-xl border bg-card transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/15"
                    : "border-border/80 hover:border-primary/40"
                }`}
              >
                <div>
                  <ClubCoverBanner
                    name={club.name}
                    code={club.code}
                    coverUrl={club.coverUrl}
                    fallbackUrl={fallbackMedia?.cover}
                    className="h-28 w-full"
                  >
                    <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-white/95 px-2 py-0.5 shadow-xs backdrop-blur-xs">
                      {isSelected && (
                        <Badge tone="primary" dot={false}>
                          Đang chọn
                        </Badge>
                      )}
                      <StatusBadge status={club.status} />
                    </div>
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-end gap-2.5">
                      <ClubAvatar
                        name={club.name}
                        code={club.code}
                        logoUrl={club.logoUrl}
                        fallbackUrl={fallbackMedia?.logo}
                        size="md"
                      />
                      <div className="min-w-0 flex-1 text-white drop-shadow-xs">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/90">
                          {club.code}
                        </span>
                        <h3 className="truncate text-sm font-extrabold leading-tight">{club.name}</h3>
                      </div>
                    </div>
                  </ClubCoverBanner>

                  <div className="space-y-2 p-3.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {club.activityField && (
                        <Badge tone="neutral" dot={false}>
                          {club.activityField}
                        </Badge>
                      )}
                      {club.contactEmail && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Mail size={11} /> {club.contactEmail}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {club.description || "Chưa có mô tả chi tiết cho câu lạc bộ này."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-border/60 bg-muted/20 px-3.5 py-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => onSelectClubAndTab(club.id, "overview")}
                    >
                      <Sparkles size={12} />{" "}
                      {canEditSettings || canInClub("application.view", club.id) ? "Quản lý CLB" : "Tổng quan CLB"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectClubAndTab(club.id, "members")}
                    >
                      <Users size={12} /> Thành viên
                    </Button>
                    {canInClub("application.view", club.id) ||
                    canInClub("application.review", club.id) ||
                    canInClub("application.approve", club.id) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectClubAndTab(club.id, "applications")}
                      >
                        <ClipboardList size={12} /> Đơn
                      </Button>
                    ) : (
                      (canInClub("chat.view", club.id) || canInClub("chat.send", club.id)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectClubAndTab(club.id, "chat")}
                        >
                          <MessageSquare size={12} /> Chat & AI
                        </Button>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {canEditSettings && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Cấu hình thông tin & ảnh CLB"
                        onClick={() => onSelectClubAndTab(club.id, "settings")}
                      >
                        <Settings size={13} /> Ảnh & Cài đặt
                      </Button>
                    )}
                    {canActivate && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: club.id, status: "ACTIVE" })}
                      >
                        <LockOpen size={12} /> Kích hoạt
                      </Button>
                    )}
                    {canDeactivate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          confirm(`Tạm ngừng hoạt động câu lạc bộ "${club.name}"?`) &&
                          statusMutation.mutate({ id: club.id, status: "INACTIVE" })
                        }
                      >
                        <Lock size={12} /> Tạm dừng
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
