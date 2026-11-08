"use client";

import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ClipboardList,
  Eye,
  Paperclip,
  Pencil,
  ShieldCheck,
  X,
} from "lucide-react";
import { apiModel, Application, Department } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useUserNames } from "@/hooks/user/useUsers";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions, UserIdentityCell } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { formatDay } from "@/lib/utils";
import {
  AppManageDraft,
  EMPTY_APP_DRAFT,
  endOfDayExclusiveIso,
  startOfDayIso,
  toAppManageDraft,
} from "@/forms/application/application-form";
import {
  ReviewApplicationModal,
  UpsertApplicationModal,
} from "@/components/application/ApplicationManagementModals";
import {
  ApplicationDetailDrawer,
  ClubApplicationsFilterBar,
} from "@/components/application/ApplicationDetailDrawer";

const LIMIT = 20;

export function ApplicationsTab({
  clubId,
  clubName,
  activeDepartments,
  onNotice,
  onError,
  onRefreshMembers,
}: {
  clubId: string;
  clubName?: string;
  activeDepartments: Department[];
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
  onRefreshMembers: () => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const canViewUsers = session.can("user.view");
  const nameOf = useUserNames(canViewUsers);

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [offset, setOffset] = useState(0);

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [review, setReview] = useState<{ app: Application; approve: boolean } | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [draft, setDraft] = useState<AppManageDraft>(EMPTY_APP_DRAFT);

  const canViewList = session.canInClub("application.view", clubId);
  const canViewDetail =
    session.canInClub("application.view_detail", clubId) ||
    session.canInClub("application.review", clubId);
  const canCreateForClub = session.canInClub("application.create", clubId);
  const canApprove =
    session.canInClub("application.approve", clubId) || session.canInClub("application.review", clubId);
  const canReject =
    session.canInClub("application.reject", clubId) || session.canInClub("application.review", clubId);
  const canUpdate =
    session.canInClub("application.update", clubId) || session.canInClub("application.review", clubId);

  const apps = useQuery({
    queryKey: ["club-applications", clubId, statusFilter, search, createdFrom, createdTo, offset],
    queryFn: () =>
      apiModel.clubApplications(clubId, {
        status: statusFilter || undefined,
        search: search.trim() || undefined,
        createdFrom: startOfDayIso(createdFrom),
        createdTo: endOfDayExclusiveIso(createdTo),
        offset,
        limit: LIMIT,
      }),
    placeholderData: keepPreviousData,
    enabled: !!clubId && canViewList,
  });

  const activeFormQuery = useQuery({
    queryKey: ["club-application-form", clubId],
    queryFn: () => apiModel.clubApplicationForm(clubId),
    enabled: !!clubId,
  });

  const refreshApps = () => {
    queryClient.invalidateQueries({ queryKey: ["club-applications", clubId] });
    if (selectedAppId) {
      queryClient.invalidateQueries({ queryKey: ["club-application-detail", clubId, selectedAppId] });
    }
  };

  const applicant = (a: Application) => {
    const user = nameOf(a.applicantId);
    const sub =
      [a.applicantStudentCode ?? user?.studentCode, a.applicantEmail ?? user?.email]
        .filter(Boolean)
        .join(" · ") || a.applicantId.slice(0, 8);
    return <UserIdentityCell name={a.applicantName ?? user?.fullName} subtitle={sub} />;
  };

  const openCreateApp = () => {
    setEditingApp(null);
    setDraft({
      ...EMPTY_APP_DRAFT,
      applicantId: session.user?.id || "",
      preferredDepartmentId: activeDepartments[0]?.id || "",
    });
    setModalMode("create");
  };

  const openEditApp = (app: Application) => {
    setEditingApp(app);
    setDraft(toAppManageDraft(app));
    setModalMode("edit");
  };

  const hasFilters = search.trim() !== "" || statusFilter !== "" || createdFrom !== "" || createdTo !== "";
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCreatedFrom("");
    setCreatedTo("");
    setOffset(0);
  };

  return (
    <div className="flex flex-1 flex-col space-y-3">
      <ClubApplicationsFilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setOffset(0);
        }}
        createdFrom={createdFrom}
        onCreatedFromChange={(v) => {
          setCreatedFrom(v);
          setOffset(0);
        }}
        createdTo={createdTo}
        onCreatedToChange={(v) => {
          setCreatedTo(v);
          setOffset(0);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => {
          setStatusFilter(v);
          setOffset(0);
        }}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        canCreateForClub={canCreateForClub}
        onCreateApp={openCreateApp}
      />

      {!canViewList ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="Bạn chưa có quyền xem hàng đợi đơn đăng ký"
          description="Cần quyền application.view tại CLB để tra cứu danh sách đơn ứng tuyển."
          actionLabel={canCreateForClub ? "Tạo hồ sơ đơn" : undefined}
          onAction={canCreateForClub ? openCreateApp : undefined}
        />
      ) : apps.isPending ? (
        <LoadingRows />
      ) : apps.isError ? (
        <ErrorState message={describeError(apps.error)} onRetry={() => apps.refetch()} />
      ) : !apps.data.items.length ? (
        <EmptyState
          icon={<ClipboardList />}
          title={hasFilters ? "Không có đơn đăng ký khớp bộ lọc" : "Chưa có đơn đăng ký nào"}
          description={
            hasFilters
              ? "Hãy điều chỉnh khoảng ngày, trạng thái hoặc từ khoá tìm kiếm."
              : "Bạn có thể đợi ứng viên nộp đơn qua trang Khám phá CLB hoặc tạo hồ sơ đơn hộ ứng viên."
          }
          actionLabel={hasFilters ? "Xoá bộ lọc" : canCreateForClub ? "Tạo hồ sơ đơn" : undefined}
          onAction={hasFilters ? clearFilters : canCreateForClub ? openCreateApp : undefined}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Đơn đăng ký"
            rows={apps.data.items}
            rowKey={(a) => a.id}
            onRowClick={canViewDetail ? (a) => setSelectedAppId(a.id) : undefined}
            columns={[
              {
                key: "date",
                header: "Ngày gửi",
                render: (a) => <span className="font-mono font-bold text-primary">{formatDay(a.createdAt)}</span>,
              },
              { key: "applicant", header: "Người nộp", render: (a) => applicant(a) },
              {
                key: "dept",
                header: "Ban nguyện vọng",
                render: (a) =>
                  a.preferredDepartmentName ? (
                    <Badge tone="primary" dot={false}>
                      {a.preferredDepartmentName}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
              {
                key: "major",
                header: "Ngành / Khóa / SĐT",
                render: (a) => (
                  <div className="text-xs">
                    <p className="font-semibold">
                      {[a.facultyMajor, a.academicYear].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {a.applicantPhone && (
                      <p className="font-mono text-[11px] text-muted-foreground">{a.applicantPhone}</p>
                    )}
                  </div>
                ),
              },
              {
                key: "files",
                header: "Tệp đính kèm",
                render: (a) =>
                  a.attachments && a.attachments.length > 0 ? (
                    <Badge tone="neutral" dot={false}>
                      <Paperclip size={11} /> {a.attachments.length} tệp
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
              {
                key: "message",
                header: "Lý do ứng tuyển",
                className: "max-w-[260px]",
                render: (a) => <p className="truncate text-muted-foreground">{a.message}</p>,
              },
              { key: "status", header: "Trạng thái", render: (a) => <StatusBadge status={a.status} /> },
              {
                key: "actions",
                header: "Thao tác",
                className: "text-right",
                render: (a) => (
                  <TableRowActions
                    actions={[
                      ...(canViewDetail
                        ? [{ icon: <Eye />, label: "Xem chi tiết & tệp", onClick: () => setSelectedAppId(a.id) }]
                        : []),
                      ...(canUpdate
                        ? [
                            {
                              icon: <Pencil />,
                              label: "Chỉnh sửa hồ sơ & ghi chú",
                              onClick: () => openEditApp(a),
                            },
                          ]
                        : []),
                      ...(a.status === "PENDING" && canApprove
                        ? [{ icon: <Check />, label: "Duyệt đơn", onClick: () => setReview({ app: a, approve: true }) }]
                        : []),
                      ...(a.status === "PENDING" && canReject
                        ? [
                            {
                              icon: <X />,
                              label: "Từ chối đơn",
                              danger: true,
                              onClick: () => setReview({ app: a, approve: false }),
                            },
                          ]
                        : []),
                    ]}
                  />
                ),
              },
            ]}
          />
          <Pagination offset={offset} limit={LIMIT} total={apps.data.total} onOffset={setOffset} />
        </>
      )}

      <ReviewApplicationModal
        key={review?.app.id ?? "none"}
        clubId={clubId}
        review={review}
        onClose={() => setReview(null)}
        activeDepartments={activeDepartments}
        onSuccess={(approve, reviewDeptId) => {
          onNotice(
            approve
              ? `Đã duyệt đơn, thêm thành viên CLB${reviewDeptId ? " và phân vào Ban" : ""}.`
              : "Đã từ chối đơn đăng ký."
          );
          onError("");
          refreshApps();
          onRefreshMembers();
        }}
        onError={onError}
      />

      <UpsertApplicationModal
        clubId={clubId}
        modalMode={modalMode}
        editingApp={editingApp}
        draft={draft}
        setDraft={setDraft}
        activeDepartments={activeDepartments}
        activeForm={activeFormQuery.data}
        canViewDetail={canViewDetail}
        onClose={() => {
          setModalMode(null);
          setEditingApp(null);
        }}
        onSaved={(mode) => {
          onNotice(
            mode === "edit"
              ? "Đã cập nhật hồ sơ đơn đăng ký & ghi chú xét duyệt."
              : "Đã tạo hồ sơ đơn đăng ký mới."
          );
          onError("");
          refreshApps();
          onRefreshMembers();
        }}
        onFileDeleted={(updated) => {
          onNotice("Đã xoá tệp đính kèm khỏi đơn đăng ký.");
          onError("");
          if (editingApp?.id === updated.id) setEditingApp(updated);
          refreshApps();
        }}
        onError={onError}
      />

      <ApplicationDetailDrawer
        clubId={clubId}
        clubName={clubName}
        selectedAppId={selectedAppId}
        onClose={() => setSelectedAppId(null)}
        canViewDetail={canViewDetail}
        canUpdate={canUpdate}
        canApprove={canApprove}
        canReject={canReject}
        activeForm={activeFormQuery.data}
        renderApplicant={applicant}
        onOpenEdit={openEditApp}
        onOpenReview={(app, approve) => setReview({ app, approve })}
        onFilesChanged={(updated, msg) => {
          onNotice(msg);
          onError("");
          if (editingApp?.id === updated.id) setEditingApp(updated);
          refreshApps();
        }}
        onError={onError}
      />
    </div>
  );
}
export { ApplicationsTab as ClubApplicationsTab };
