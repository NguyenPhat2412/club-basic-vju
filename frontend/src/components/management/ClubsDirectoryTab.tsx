"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import {
  Building2,
  ClipboardList,
  FileText,
  FilterX,
  LayoutGrid,
  Lock,
  LockOpen,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Sparkles,
  Table2,
  Users,
  X,
} from "lucide-react";
import { apiModel, Club } from "@/lib/api";
import { clubSlugFromCode } from "@/lib/media";
import { ClubAvatar, useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { ClubsDirectoryCards } from "@/components/management/ClubsDirectoryCards";
import { DataTable } from "@/components/shared/DataTable";
import { describeError } from "@/components/shared/ListPage";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ClubManagementTabKey } from "@/forms/club/club-form";
import { cn } from "@/lib/utils";

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
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);

  const activityFields = useMemo(() => {
    const set = new Set<string>();
    clubs.forEach((c) => {
      if (c.activityField?.trim()) set.add(c.activityField.trim());
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

  const pagedClubs = useMemo(
    () => filteredClubs.slice(offset, offset + limit),
    [filteredClubs, offset, limit]
  );

  const activeCount = useMemo(() => clubs.filter((c) => c.status === "ACTIVE").length, [clubs]);
  const inactiveCount = clubs.length - activeCount;
  const hasFilters = Boolean(search.trim() || fieldFilter || statusFilter);

  const resetFilters = () => {
    setSearch("");
    setFieldFilter("");
    setStatusFilter("");
    setOffset(0);
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      apiModel.updateClubStatus(id, status),
    onSuccess: (updated) => {
      onNotice(
        updated.status === "ACTIVE"
          ? `Đã kích hoạt câu lạc bộ "${updated.name}" (${updated.code}).`
          : `Đã tạm ngừng hoạt động câu lạc bộ "${updated.name}" (${updated.code}).`
      );
      onError("");
      queryClient.invalidateQueries({ queryKey: qk.clubs() });
      queryClient.invalidateQueries({ queryKey: qk.home("public-clubs") });
      queryClient.invalidateQueries({ queryKey: qk.dashboard("public-clubs") });
    },
    onError: (err) => onError(describeError(err)),
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="grid gap-2.5 border-b border-border/60 bg-muted/20 px-4 py-3 sm:grid-cols-3 sm:px-6">
        <div className="rounded-xl border border-border/70 bg-card px-3.5 py-2.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tổng số CLB quản lý
          </p>
          <p className="mt-0.5 text-xl font-extrabold text-foreground tabular-nums">{clubs.length}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card px-3.5 py-2.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Đang hoạt động
          </p>
          <p className="mt-0.5 text-xl font-extrabold text-primary tabular-nums">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card px-3.5 py-2.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Lĩnh vực & Tạm ngừng
          </p>
          <p className="mt-0.5 text-xl font-extrabold text-foreground tabular-nums">
            {activityFields.length} lĩnh vực · {inactiveCount} tạm ngừng
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-card px-4 py-2.5 sm:px-6">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[210px] flex-1 sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder="Tìm theo mã, tên CLB, lĩnh vực, email…" className="h-8 pl-8 pr-7 text-xs" />
            {search && (
              <button type="button" aria-label="Xoá tìm kiếm" onClick={() => { setSearch(""); setOffset(0); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>
          <Select aria-label="Lọc lĩnh vực" value={fieldFilter} onChange={(e) => { setFieldFilter(e.target.value); setOffset(0); }} className="h-8 w-full text-xs sm:w-48">
            <option value="">Tất cả lĩnh vực ({activityFields.length})</option>
            {activityFields.map((field) => <option key={field} value={field}>{field}</option>)}
          </Select>
          <Select aria-label="Lọc trạng thái CLB" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as "" | "ACTIVE" | "INACTIVE"); setOffset(0); }} className="h-8 w-full text-xs sm:w-44">
            <option value="">Mọi trạng thái ({clubs.length})</option>
            <option value="ACTIVE">Đang hoạt động ({activeCount})</option>
            <option value="INACTIVE">Ngừng hoạt động ({inactiveCount})</option>
          </Select>
          {hasFilters && <Button variant="outline" size="sm" onClick={resetFilters} className="h-8"><FilterX size={13} /> Xoá lọc</Button>}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Chế độ hiển thị">
            <button type="button" onClick={() => setViewMode("table")} className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors", viewMode === "table" ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground")}><Table2 size={13} /> Bảng</button>
            <button type="button" onClick={() => setViewMode("cards")} className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors", viewMode === "cards" ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground")}><LayoutGrid size={13} /> Thẻ</button>
          </div>
          {canCreateClub && <Button size="sm" onClick={onOpenCreateClub} className="h-8"><Plus size={14} /> Thành lập CLB mới</Button>}
        </div>
      </div>

      {filteredClubs.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="Không tìm thấy câu lạc bộ phù hợp"
          description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái để xem đầy đủ danh sách CLB."
          actionLabel={hasFilters ? "Xoá bộ lọc" : undefined}
          onAction={hasFilters ? resetFilters : undefined}
        />
      ) : viewMode === "table" ? (
        <DataTable
          ariaLabel="Danh sách câu lạc bộ quản lý"
          minWidth="min-w-[720px]"
          rows={pagedClubs}
          rowKey={(c) => c.id}
          onRowClick={(c) => onSelectClubAndTab(c.id, "overview")}
          columns={[
            {
              key: "index",
              header: "STT",
              className: "w-10 text-center font-mono text-muted-foreground",
              render: (c) => <span>{offset + pagedClubs.indexOf(c) + 1}</span>,
            },
            {
              key: "club",
              header: "Câu lạc bộ",
              className: "min-w-[190px] max-w-[240px]",
              sortValue: (c) => c.name,
              render: (c) => {
                const media = mediaCatalog.data?.clubs[clubSlugFromCode(c.code)];
                const isSelected = c.id === activeClubId;
                return (
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ClubAvatar name={c.name} code={c.code} logoUrl={c.logoUrl} fallbackUrl={media?.logo} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-bold text-foreground" title={c.name}>
                          {c.name}
                        </p>
                        {isSelected && (
                          <Badge tone="primary" dot={false}>
                            Đang chọn
                          </Badge>
                        )}
                      </div>
                      {c.contactEmail && (
                        <p className="truncate text-[11px] text-muted-foreground">{c.contactEmail}</p>
                      )}
                    </div>
                  </div>
                );
              },
            },
            {
              key: "code",
              header: "Mã CLB",
              className: "whitespace-nowrap",
              sortValue: (c) => c.code,
              render: (c) => (
                <code className="rounded-md bg-primary/8 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                  {c.code}
                </code>
              ),
            },
            {
              key: "field",
              header: "Lĩnh vực",
              className: "whitespace-nowrap",
              sortValue: (c) => c.activityField ?? "",
              render: (c) =>
                c.activityField ? (
                  <Badge tone="neutral" dot={false}>
                    {c.activityField}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            {
              key: "status",
              header: "Trạng thái",
              className: "whitespace-nowrap",
              sortValue: (c) => c.status,
              render: (c) => <StatusBadge status={c.status} />,
            },
            {
              key: "shortcuts",
              header: "Điều phối nhanh",
              className: "whitespace-nowrap",
              render: (c) => {
                const pillCls = "inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-semibold text-foreground hover:border-primary/40 hover:bg-primary/8 hover:text-primary";
                return (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => onSelectClubAndTab(c.id, "overview")} className={pillCls}><Sparkles size={11} /> Tổng quan</button>
                    <button type="button" onClick={() => onSelectClubAndTab(c.id, "members")} className={pillCls}><Users size={11} /> Thành viên</button>
                    {(canInClub("application.view", c.id) || canInClub("application.review", c.id)) ? (
                      <button type="button" onClick={() => onSelectClubAndTab(c.id, "applications")} className={pillCls}><ClipboardList size={11} /> Đơn</button>
                    ) : (canInClub("chat.view", c.id) || canInClub("chat.send", c.id)) ? (
                      <button type="button" onClick={() => onSelectClubAndTab(c.id, "chat")} className={pillCls}><MessageSquare size={11} /> Chat</button>
                    ) : null}
                  </div>
                );
              },
            },
            {
              key: "actions",
              header: "Thao tác",
              className: "text-right whitespace-nowrap",
              render: (c) => {
                const canActivate = c.status !== "ACTIVE" && canInClub("club.active", c.id);
                const canDeactivate = c.status === "ACTIVE" && canInClub("club.inactive", c.id);
                const canEditSettings =
                  canInClub("club.update", c.id) || canActivate || canDeactivate || canInClub("notification.send", c.id);
                return (
                  <TableRowActions
                    actions={[
                      ...(canInClub("document.view", c.id)
                        ? [{ icon: <FileText />, label: "Kho tài liệu CLB", onClick: () => onSelectClubAndTab(c.id, "documents") }]
                        : []),
                      ...((canInClub("chat.view", c.id) || canInClub("chat.send", c.id))
                        ? [{ icon: <MessageSquare />, label: "Kênh Chat & AI", onClick: () => onSelectClubAndTab(c.id, "chat") }]
                        : []),
                      ...(canEditSettings
                        ? [{ icon: <Settings />, label: "Cài đặt CLB", onClick: () => onSelectClubAndTab(c.id, "settings") }]
                        : []),
                      ...(canActivate
                        ? [
                            {
                              icon: <LockOpen />,
                              label: "Kích hoạt CLB",
                              disabled: statusMutation.isPending,
                              onClick: () => statusMutation.mutate({ id: c.id, status: "ACTIVE" }),
                            },
                          ]
                        : []),
                      ...(canDeactivate
                        ? [
                            {
                              icon: <Lock />,
                              label: "Tạm ngừng CLB",
                              danger: true,
                              disabled: statusMutation.isPending,
                              onClick: () =>
                                confirm(`Tạm ngừng hoạt động câu lạc bộ "${c.name}"?`) &&
                                statusMutation.mutate({ id: c.id, status: "INACTIVE" }),
                            },
                          ]
                        : []),
                    ]}
                  />
                );
              },
            },
          ]}
        />
      ) : (
        <ClubsDirectoryCards
          clubs={pagedClubs}
          activeClubId={activeClubId}
          mediaMap={mediaCatalog.data?.clubs}
          onSelectClubAndTab={onSelectClubAndTab}
        />
      )}

      {filteredClubs.length > 0 && (
        <Pagination
          offset={offset}
          limit={limit}
          total={filteredClubs.length}
          onOffset={setOffset}
          onLimit={setLimit}
        />
      )}
    </div>
  );
}
