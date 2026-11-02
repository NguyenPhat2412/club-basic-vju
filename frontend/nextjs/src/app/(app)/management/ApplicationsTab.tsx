"use client";
import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ClipboardList,
  Eye,
  FilterX,
  Lock,
  Paperclip,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  apiModel,
  Application,
  Department,
  UpdateApplicationInput,
} from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useUserNames } from "@/hooks/useUserNames";
import { ApplicationFilesList, CustomFieldsInputs } from "@/components/shared/ApplicationFileView";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";

const LIMIT = 20;

type AppManageDraft = {
  applicantId: string;
  preferredDepartmentId: string;
  secondaryDepartmentId: string;
  applicantPhone: string;
  facultyMajor: string;
  academicYear: string;
  gpa: string;
  socialPortfolioUrl: string;
  selfIntroduction: string;
  skillsExperience: string;
  availability: string;
  message: string;
  customAnswers: Record<string, unknown>;
  reviewNote: string;
  internalNote: string;
  assignDepartmentId: string;
};

const EMPTY_APP_DRAFT: AppManageDraft = {
  applicantId: "",
  preferredDepartmentId: "",
  secondaryDepartmentId: "",
  applicantPhone: "",
  facultyMajor: "",
  academicYear: "",
  gpa: "",
  socialPortfolioUrl: "",
  selfIntroduction: "",
  skillsExperience: "",
  availability: "",
  message: "",
  customAnswers: {},
  reviewNote: "",
  internalNote: "",
  assignDepartmentId: "",
};

function startOfDayIso(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

function endOfDayExclusiveIso(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  const start = new Date(`${dateStr}T00:00:00`);
  start.setDate(start.getDate() + 1);
  return start.toISOString();
}

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
  const [reviewDeptId, setReviewDeptId] = useState("");
  const [note, setNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [draft, setDraft] = useState<AppManageDraft>(EMPTY_APP_DRAFT);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const canViewList = session.canInClub("application.view", clubId);
  const canViewDetail = canViewList || session.canInClub("application.view_detail", clubId) || session.canInClub("application.review", clubId);
  const canCreateForClub = session.canInClub("application.create", clubId);
  const canApprove = session.canInClub("application.approve", clubId) || session.canInClub("application.review", clubId);
  const canReject = session.canInClub("application.reject", clubId) || session.canInClub("application.review", clubId);
  const canUpdate = session.canInClub("application.update", clubId) || session.canInClub("application.review", clubId);

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

  const detailQuery = useQuery({
    queryKey: ["club-application-detail", clubId, selectedAppId],
    queryFn: () => apiModel.clubApplicationDetail(clubId, selectedAppId!),
    enabled: !!clubId && !!selectedAppId && canViewDetail,
  });

  const activeFormQuery = useQuery({
    queryKey: ["club-application-form", clubId],
    queryFn: () => apiModel.clubApplicationForm(clubId),
    enabled: !!clubId,
  });

  const usersListQuery = useQuery({
    queryKey: ["users", "for-application-create"],
    queryFn: () => apiModel.users("", 0, 100),
    enabled: session.ready && canViewUsers && modalMode === "create",
  });

  const refreshApps = () => {
    queryClient.invalidateQueries({ queryKey: ["club-applications", clubId] });
    if (selectedAppId) {
      queryClient.invalidateQueries({ queryKey: ["club-application-detail", clubId, selectedAppId] });
    }
  };

  const reviewMutation = useMutation({
    mutationFn: ({ app, approve }: { app: Application; approve: boolean }) =>
      approve
        ? apiModel.approve(clubId, app.id, {
            reviewNote: note.trim() || undefined,
            internalNote: internalNote.trim() || undefined,
            departmentId: reviewDeptId || undefined,
            skipDepartmentAssignment: !reviewDeptId,
          })
        : apiModel.reject(clubId, app.id, {
            reviewNote: note.trim() || undefined,
            internalNote: internalNote.trim() || undefined,
          }),
    onSuccess: (_, { approve }) => {
      onNotice(
        approve
          ? `Đã duyệt đơn, thêm thành viên CLB${reviewDeptId ? " và phân vào Ban" : ""}.`
          : "Đã từ chối đơn đăng ký."
      );
      onError("");
      setReview(null);
      setNote("");
      setInternalNote("");
      setReviewDeptId("");
      refreshApps();
      onRefreshMembers();
    },
    onError: (e) => onError(describeError(e)),
  });

  const saveAppMutation = useMutation({
    mutationFn: async () => {
      let saved: Application;
      if (modalMode === "edit" && editingApp) {
        const payload: UpdateApplicationInput = {
          preferredDepartmentId: draft.preferredDepartmentId || undefined,
          secondaryDepartmentId: draft.secondaryDepartmentId || undefined,
          applicantPhone: draft.applicantPhone.trim(),
          facultyMajor: draft.facultyMajor.trim(),
          academicYear: draft.academicYear.trim(),
          gpa: draft.gpa.trim(),
          socialPortfolioUrl: draft.socialPortfolioUrl.trim(),
          selfIntroduction: draft.selfIntroduction.trim(),
          skillsExperience: draft.skillsExperience.trim(),
          availability: draft.availability.trim(),
          message: draft.message.trim(),
          customAnswers: draft.customAnswers,
          reviewNote: draft.reviewNote.trim(),
          internalNote: draft.internalNote.trim(),
          assignDepartmentId: editingApp.status === "APPROVED" && draft.assignDepartmentId ? draft.assignDepartmentId : undefined,
        };
        saved = await apiModel.updateClubApplication(clubId, editingApp.id, payload);
      } else {
        saved = await apiModel.apply(clubId, {
          applicantId: draft.applicantId.trim() || undefined,
          formId: activeFormQuery.data?.id || undefined,
          preferredDepartmentId: draft.preferredDepartmentId || undefined,
          secondaryDepartmentId: draft.secondaryDepartmentId || undefined,
          applicantPhone: draft.applicantPhone.trim() || undefined,
          facultyMajor: draft.facultyMajor.trim() || undefined,
          academicYear: draft.academicYear.trim() || undefined,
          gpa: draft.gpa.trim() || undefined,
          socialPortfolioUrl: draft.socialPortfolioUrl.trim() || undefined,
          selfIntroduction: draft.selfIntroduction.trim() || undefined,
          skillsExperience: draft.skillsExperience.trim() || undefined,
          availability: draft.availability.trim() || undefined,
          message: draft.message.trim(),
          customAnswers: Object.keys(draft.customAnswers).length > 0 ? draft.customAnswers : undefined,
        });
      }
      for (const file of pendingFiles) {
        await apiModel.uploadApplicationFile(saved.id, file, "APPLICANT_ATTACHMENT");
      }
      return canViewDetail ? apiModel.clubApplicationDetail(clubId, saved.id) : saved;
    },
    onSuccess: () => {
      onNotice(
        modalMode === "edit"
          ? "Đã cập nhật hồ sơ đơn đăng ký & ghi chú xét duyệt."
          : "Đã tạo hồ sơ đơn đăng ký mới."
      );
      onError("");
      setModalMode(null);
      setEditingApp(null);
      setPendingFiles([]);
      refreshApps();
      onRefreshMembers();
    },
    onError: (e) => onError(describeError(e)),
  });

  const uploadInlineMutation = useMutation({
    mutationFn: async ({ appId, files }: { appId: string; files: File[] }) => {
      for (const file of files) {
        await apiModel.uploadApplicationFile(appId, file, "APPLICANT_ATTACHMENT");
      }
      return apiModel.clubApplicationDetail(clubId, appId);
    },
    onSuccess: (updated) => {
      onNotice("Đã tải thêm tệp đính kèm cho đơn đăng ký.");
      onError("");
      if (editingApp?.id === updated.id) setEditingApp(updated);
      refreshApps();
    },
    onError: (e) => onError(describeError(e)),
  });

  const deleteFileMutation = useMutation({
    mutationFn: async ({ appId, fileId }: { appId: string; fileId: string }) => {
      await apiModel.deleteApplicationFile(appId, fileId);
      return apiModel.clubApplicationDetail(clubId, appId);
    },
    onSuccess: (updated) => {
      onNotice("Đã xoá tệp đính kèm khỏi đơn đăng ký.");
      onError("");
      if (editingApp?.id === updated.id) setEditingApp(updated);
      refreshApps();
    },
    onError: (e) => onError(describeError(e)),
  });

  const applicant = (a: Application) => {
    const user = nameOf(a.applicantId);
    const name = a.applicantName ?? user?.fullName ?? "Thành viên";
    const sub =
      [a.applicantStudentCode ?? user?.studentCode, a.applicantEmail ?? user?.email]
        .filter(Boolean)
        .join(" · ") || a.applicantId.slice(0, 8);
    return (
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
          {name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="max-w-56 truncate font-bold">{name}</p>
          <p className="max-w-56 truncate font-mono text-[10.5px] text-muted-foreground">{sub}</p>
        </div>
      </div>
    );
  };

  const openReview = (app: Application, approve: boolean) => {
    setReview({ app, approve });
    setReviewDeptId(app.preferredDepartmentId || "");
    setNote(app.reviewNote || "");
    setInternalNote(app.internalNote || "");
    reviewMutation.reset();
  };

  const openCreateApp = () => {
    setEditingApp(null);
    setDraft({
      ...EMPTY_APP_DRAFT,
      applicantId: session.user?.id || "",
      preferredDepartmentId: activeDepartments[0]?.id || "",
    });
    setPendingFiles([]);
    saveAppMutation.reset();
    setModalMode("create");
  };

  const openEditApp = (app: Application) => {
    setEditingApp(app);
    setDraft({
      applicantId: app.applicantId,
      preferredDepartmentId: app.preferredDepartmentId || "",
      secondaryDepartmentId: app.secondaryDepartmentId || "",
      applicantPhone: app.applicantPhone || "",
      facultyMajor: app.facultyMajor || "",
      academicYear: app.academicYear || "",
      gpa: app.gpa || "",
      socialPortfolioUrl: app.socialPortfolioUrl || "",
      selfIntroduction: app.selfIntroduction || "",
      skillsExperience: app.skillsExperience || "",
      availability: app.availability || "",
      message: app.message || "",
      customAnswers: { ...(app.customAnswers ?? {}) },
      reviewNote: app.reviewNote || "",
      internalNote: app.internalNote || "",
      assignDepartmentId: app.preferredDepartmentId || "",
    });
    setPendingFiles([]);
    saveAppMutation.reset();
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

  const detailApp = detailQuery.data;

  return (
    <div className="flex flex-1 flex-col space-y-3">
      {/* Thanh Tìm kiếm, Lọc trạng thái, Khoảng ngày gửi & Nút Tạo hồ sơ đơn */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 pt-3 sm:px-6">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            placeholder="Tìm theo tên, email ứng viên…"
            className="pl-8 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            aria-label="Từ ngày"
            title="Lọc đơn gửi từ ngày"
            value={createdFrom}
            onChange={(e) => {
              setCreatedFrom(e.target.value);
              setOffset(0);
            }}
            className="h-9 w-36 text-xs"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="date"
            aria-label="Đến ngày"
            title="Lọc đơn gửi đến ngày"
            value={createdTo}
            onChange={(e) => {
              setCreatedTo(e.target.value);
              setOffset(0);
            }}
            className="h-9 w-36 text-xs"
          />
          <Select
            aria-label="Lọc trạng thái đơn"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            className="h-9 w-48 text-xs"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">PENDING — Chờ duyệt</option>
            <option value="APPROVED">APPROVED — Đã duyệt</option>
            <option value="REJECTED">REJECTED — Đã từ chối</option>
            <option value="CANCELLED">CANCELLED — Đã rút</option>
          </Select>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <FilterX size={14} /> Xoá bộ lọc
            </Button>
          )}
          {canCreateForClub && (
            <Button size="sm" onClick={openCreateApp}>
              <Plus size={14} /> Tạo hồ sơ đơn
            </Button>
          )}
        </div>
      </div>

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
                    <Badge tone="primary" dot={false}>{a.preferredDepartmentName}</Badge>
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
                        ? [{ icon: <Check />, label: "Duyệt đơn", onClick: () => openReview(a, true) }]
                        : []),
                      ...(a.status === "PENDING" && canReject
                        ? [
                            {
                              icon: <X />,
                              label: "Từ chối đơn",
                              danger: true,
                              onClick: () => openReview(a, false),
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

      {/* Modal Duyệt / Từ chối đơn (tách rõ Phản hồi ứng viên và Ghi chú nội bộ BCN) */}
      <ModalShell
        open={!!review}
        onClose={() => setReview(null)}
        title={review?.approve ? "Duyệt đơn đăng ký" : "Từ chối đơn đăng ký"}
        icon={review?.approve ? <Check /> : <X />}
        size="md"
        onSubmit={() => review && reviewMutation.mutate(review)}
        submitLabel={review?.approve ? "Duyệt & Thêm thành viên" : "Xác nhận từ chối"}
        submitDanger={!review?.approve}
        submitLoading={reviewMutation.isPending}
      >
        {review && (
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs leading-5">
            <p className="font-bold text-foreground">
              {review.app.applicantName ?? nameOf(review.app.applicantId)?.fullName ?? "Người nộp"}
            </p>
            <p className="mt-0.5 line-clamp-3 text-muted-foreground">{review.app.message}</p>
          </div>
        )}
        {review?.approve && activeDepartments.length > 0 && (
          <FormField label="Phân vào Ban ngay khi duyệt (tuỳ chọn)">
            <Select value={reviewDeptId} onChange={(e) => setReviewDeptId(e.target.value)}>
              <option value="">— Chưa phân ban (chỉ thêm làm thành viên CLB) —</option>
              {activeDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.id === review.app.preferredDepartmentId
                    ? " (Nguyện vọng 1)"
                    : d.id === review.app.secondaryDepartmentId
                    ? " (Nguyện vọng 2)"
                    : ""}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField
          label="Phản hồi gửi ứng viên (tuỳ chọn)"
          hint="Hiển thị trực tiếp cho sinh viên trong chi tiết đơn đăng ký."
        >
          <Textarea
            rows={2}
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              review?.approve
                ? "Lời chào mừng hoặc hướng dẫn bước tiếp theo cho thành viên mới…"
                : "Lý do từ chối hoặc góp ý thân thiện gửi tới ứng viên…"
            }
          />
        </FormField>
        <FormField
          label="Ghi chú nội bộ Ban Chủ nhiệm (ẩn với ứng viên)"
          hint="Chỉ người có quyền xem/duyệt đơn tại CLB mới thấy ghi chú này."
        >
          <Textarea
            rows={2}
            value={internalNote}
            maxLength={1000}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder="Đánh giá nội bộ của BCN về hồ sơ ứng viên…"
          />
        </FormField>
        {reviewMutation.error && <p className="text-xs text-destructive">{describeError(reviewMutation.error)}</p>}
      </ModalShell>

      {/* Modal Tạo mới / Chỉnh sửa Hồ sơ đơn & Ghi chú */}
      <ModalShell
        open={modalMode !== null}
        onClose={() => {
          setModalMode(null);
          setEditingApp(null);
          setPendingFiles([]);
        }}
        title={
          modalMode === "edit"
            ? "Chỉnh sửa hồ sơ đơn & Ghi chú BCN"
            : "Tạo hồ sơ đơn đăng ký mới"
        }
        icon={<ClipboardList />}
        size="lg"
        onSubmit={() => saveAppMutation.mutate()}
        submitLabel={modalMode === "edit" ? "Lưu thay đổi" : "Tạo hồ sơ đơn"}
        submitLoading={saveAppMutation.isPending}
        submitDisabled={!draft.message.trim()}
      >
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {modalMode === "create" && (
            <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-3.5">
              <FormField label="Chọn người nộp đơn (Ứng viên)" required>
                {usersListQuery.data?.items && usersListQuery.data.items.length > 0 ? (
                  <Select
                    value={draft.applicantId}
                    onChange={(e) => setDraft({ ...draft, applicantId: e.target.value })}
                  >
                    {usersListQuery.data.items.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.email} ({u.email}
                        {u.studentCode ? ` · ${u.studentCode}` : ""})
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    value={draft.applicantId}
                    onChange={(e) => setDraft({ ...draft, applicantId: e.target.value })}
                    placeholder="Nhập UUID người nộp đơn (hoặc để trống để nộp bằng tài khoản hiện tại)"
                  />
                )}
              </FormField>
            </div>
          )}

          {modalMode === "edit" && editingApp && (
            <div className="grid gap-3 rounded-lg border border-primary/25 bg-primary/[0.04] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  Ghi chú xét duyệt & Phân ban (không đổi trạng thái đơn tại đây)
                </p>
                <StatusBadge status={editingApp.status} />
              </div>
              {editingApp.status === "APPROVED" && activeDepartments.length > 0 && (
                <FormField label="Bổ sung phân vào Ban (cho thành viên đang hoạt động)">
                  <Select
                    value={draft.assignDepartmentId}
                    onChange={(e) => setDraft({ ...draft, assignDepartmentId: e.target.value })}
                  >
                    <option value="">— Không thay đổi / Giữ nguyên —</option>
                    {activeDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}
              <FormField label="Phản hồi gửi ứng viên (hiển thị cho sinh viên)">
                <Textarea
                  rows={2}
                  maxLength={1000}
                  value={draft.reviewNote}
                  onChange={(e) => setDraft({ ...draft, reviewNote: e.target.value })}
                  placeholder="Phản hồi hiển thị cho người nộp đơn…"
                />
              </FormField>
              <FormField label="Ghi chú nội bộ BCN (ẩn với ứng viên)">
                <Textarea
                  rows={2}
                  maxLength={1000}
                  value={draft.internalNote}
                  onChange={(e) => setDraft({ ...draft, internalNote: e.target.value })}
                  placeholder="Ghi chú nội bộ chỉ BCN nhìn thấy…"
                />
              </FormField>
            </div>
          )}

          {activeDepartments.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Ban nguyện vọng 1">
                <Select
                  value={draft.preferredDepartmentId}
                  onChange={(e) => setDraft({ ...draft, preferredDepartmentId: e.target.value })}
                >
                  <option value="">— Chọn Ban nguyện vọng 1 —</option>
                  {activeDepartments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Ban nguyện vọng 2">
                <Select
                  value={draft.secondaryDepartmentId}
                  onChange={(e) => setDraft({ ...draft, secondaryDepartmentId: e.target.value })}
                >
                  <option value="">— Chọn Ban nguyện vọng 2 —</option>
                  {activeDepartments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </FormField>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Số điện thoại liên hệ">
              <Input
                value={draft.applicantPhone}
                onChange={(e) => setDraft({ ...draft, applicantPhone: e.target.value })}
                placeholder="VD: 0987654321"
              />
            </FormField>
            <FormField label="Khoa / Ngành học">
              <Input
                value={draft.facultyMajor}
                onChange={(e) => setDraft({ ...draft, facultyMajor: e.target.value })}
                placeholder="VD: Khoa học Máy tính & Kỹ thuật (CSE)"
              />
            </FormField>
            <FormField label="Khóa / Năm học">
              <Input
                value={draft.academicYear}
                onChange={(e) => setDraft({ ...draft, academicYear: e.target.value })}
                placeholder="VD: K9 - Năm 2"
              />
            </FormField>
            <FormField label="Điểm GPA">
              <Input
                value={draft.gpa}
                onChange={(e) => setDraft({ ...draft, gpa: e.target.value })}
                placeholder="VD: 3.45 / 4.0"
              />
            </FormField>
          </div>

          <FormField label="Link Facebook / LinkedIn / Portfolio">
            <Input
              value={draft.socialPortfolioUrl}
              onChange={(e) => setDraft({ ...draft, socialPortfolioUrl: e.target.value })}
              placeholder="https://..."
            />
          </FormField>

          <FormField label="Giới thiệu bản thân">
            <Textarea
              rows={2}
              value={draft.selfIntroduction}
              onChange={(e) => setDraft({ ...draft, selfIntroduction: e.target.value })}
              placeholder="Tóm tắt tính cách, sở thích, điểm mạnh..."
            />
          </FormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Kỹ năng & Kinh nghiệm">
              <Textarea
                rows={2}
                value={draft.skillsExperience}
                onChange={(e) => setDraft({ ...draft, skillsExperience: e.target.value })}
                placeholder="Kỹ năng chuyên môn, hoạt động từng tham gia..."
              />
            </FormField>
            <FormField label="Thời gian có thể tham gia CLB">
              <Textarea
                rows={2}
                value={draft.availability}
                onChange={(e) => setDraft({ ...draft, availability: e.target.value })}
                placeholder="VD: Các buổi tối trong tuần & cuối tuần..."
              />
            </FormField>
          </div>

          <FormField label="Lý do ứng tuyển & Mong muốn" required>
            <Textarea
              rows={3}
              value={draft.message}
              onChange={(e) => setDraft({ ...draft, message: e.target.value })}
              placeholder="Lý do muốn gia nhập CLB và mục tiêu đóng góp..."
            />
          </FormField>

          {activeFormQuery.data?.fields && activeFormQuery.data.fields.length > 0 && (
            <CustomFieldsInputs
              fields={activeFormQuery.data.fields}
              values={draft.customAnswers}
              onChange={(key, val) =>
                setDraft({
                  ...draft,
                  customAnswers: { ...draft.customAnswers, [key]: val },
                })
              }
            />
          )}

          {modalMode === "edit" && editingApp && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tệp đính kèm hiện có ({editingApp.attachments?.length ?? 0})
              </p>
              <ApplicationFilesList
                files={editingApp.attachments}
                deleting={deleteFileMutation.isPending}
                onDelete={(f) => deleteFileMutation.mutate({ appId: editingApp.id, fileId: f.id })}
              />
            </div>
          )}

          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold">
                  Đính kèm tệp (.doc, .docx, .pdf, .png, .jpg, .webp)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Có thể tải lên đơn mẫu đã điền, CV PDF hoặc hình ảnh minh chứng.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/15">
                <Upload size={13} /> Chọn tệp
                <input
                  type="file"
                  multiple
                  accept=".doc,.docx,.pdf,.png,.jpg,.jpeg,.gif,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []);
                    if (selected.length > 0) {
                      setPendingFiles((prev) => [...prev, ...selected]);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {pendingFiles.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {pendingFiles.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5 text-xs"
                  >
                    <span className="truncate font-medium">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="ml-2 text-destructive hover:underline"
                    >
                      Gỡ
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {saveAppMutation.error && (
            <p className="text-xs text-destructive">{describeError(saveAppMutation.error)}</p>
          )}
        </div>
      </ModalShell>

      {/* Drawer Chi tiết đơn đăng ký */}
      <EntityDrawer
        open={!!selectedAppId}
        onClose={() => setSelectedAppId(null)}
        title="Chi tiết đơn đăng ký"
        subtitle={clubName}
        icon={<ClipboardList />}
        footer={
          detailApp ? (
            <div className="flex flex-wrap items-center gap-2">
              {canUpdate && (
                <Button variant="outline" size="sm" onClick={() => openEditApp(detailApp)}>
                  <Pencil size={14} /> Chỉnh sửa hồ sơ & ghi chú
                </Button>
              )}
              {detailApp.status === "PENDING" && (
                <>
                  {canReject && (
                    <Button variant="destructive" size="sm" onClick={() => openReview(detailApp, false)}>
                      <X size={14} /> Từ chối
                    </Button>
                  )}
                  {canApprove && (
                    <Button size="sm" onClick={() => openReview(detailApp, true)}>
                      <Check size={14} /> Duyệt đơn
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : undefined
        }
      >
        {detailQuery.isPending ? (
          <LoadingRows rows={4} />
        ) : detailQuery.isError ? (
          <ErrorState message={describeError(detailQuery.error)} onRetry={() => detailQuery.refetch()} />
        ) : (
          detailApp && (
            <>
              <DetailList
                rows={[
                  ["Người nộp", applicant(detailApp)],
                  ["Trạng thái", <StatusBadge key="s" status={detailApp.status} />],
                  ["Ngày gửi", formatDateTime(detailApp.createdAt)],
                  ...(detailApp.cancelledAt
                    ? ([["Ngày rút đơn", formatDateTime(detailApp.cancelledAt)]] as [string, React.ReactNode][])
                    : []),
                  ["Số điện thoại", detailApp.applicantPhone || "—"],
                  ["Khoa / Ngành học", detailApp.facultyMajor || "—"],
                  ["Khóa / Năm học", detailApp.academicYear || "—"],
                  ["Điểm GPA", detailApp.gpa || "—"],
                  [
                    "Link FB / Portfolio",
                    detailApp.socialPortfolioUrl ? (
                      <a
                        key="url"
                        href={detailApp.socialPortfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        {detailApp.socialPortfolioUrl}
                      </a>
                    ) : (
                      "—"
                    ),
                  ],
                  ["Ban nguyện vọng 1", detailApp.preferredDepartmentName || "—"],
                  ["Ban nguyện vọng 2", detailApp.secondaryDepartmentName || "—"],
                  [
                    "Giới thiệu bản thân",
                    <p key="intro" className="whitespace-pre-line">
                      {detailApp.selfIntroduction || "—"}
                    </p>,
                  ],
                  [
                    "Kỹ năng & Kinh nghiệm",
                    <p key="skill" className="whitespace-pre-line">
                      {detailApp.skillsExperience || "—"}
                    </p>,
                  ],
                  ["Thời gian tham gia", detailApp.availability || "—"],
                  [
                    "Lý do ứng tuyển",
                    <p key="m" className="whitespace-pre-line font-medium">
                      {detailApp.message}
                    </p>,
                  ],
                  ["Ngày xét duyệt", formatDateTime(detailApp.reviewedAt)],
                  ["Phản hồi gửi ứng viên", detailApp.reviewNote || "—"],
                  [
                    "Ghi chú nội bộ BCN",
                    detailApp.internalNote ? (
                      <span key="inote" className="inline-flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                        <Lock size={12} className="mt-0.5 shrink-0" />
                        <span className="whitespace-pre-line">{detailApp.internalNote}</span>
                      </span>
                    ) : (
                      "—"
                    ),
                  ],
                ]}
              />

              {detailApp.customAnswers && Object.keys(detailApp.customAnswers).length > 0 && (
                <Section title="Câu trả lời riêng của CLB" icon={<ClipboardList />}>
                  <DetailList
                    rows={Object.entries(detailApp.customAnswers).map(([k, v]) => {
                      const label = activeFormQuery.data?.fields.find((f) => f.key === k)?.label || k;
                      return [label, String(v ?? "—")];
                    })}
                  />
                </Section>
              )}

              <Section title={`Tệp đính kèm (${detailApp.attachments?.length ?? 0})`} icon={<Paperclip />}>
                {canUpdate && (
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Quản lý tệp đính kèm (.doc, .docx, .pdf, ảnh) của hồ sơ này:
                    </span>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/15">
                      <Upload size={12} /> Tải thêm tệp
                      <input
                        type="file"
                        multiple
                        accept=".doc,.docx,.pdf,.png,.jpg,.jpeg,.gif,.webp"
                        className="hidden"
                        disabled={uploadInlineMutation.isPending}
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (files.length > 0) {
                            uploadInlineMutation.mutate({ appId: detailApp.id, files });
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                )}
                <ApplicationFilesList
                  files={detailApp.attachments}
                  deleting={deleteFileMutation.isPending}
                  onDelete={
                    canUpdate
                      ? (f) => deleteFileMutation.mutate({ appId: detailApp.id, fileId: f.id })
                      : undefined
                  }
                />
              </Section>
            </>
          )
        )}
      </EntityDrawer>
    </div>
  );
}
