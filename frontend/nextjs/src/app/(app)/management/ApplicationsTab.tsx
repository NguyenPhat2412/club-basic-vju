"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ClipboardList,
  Eye,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
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
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";

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
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewNote: string;
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
  status: "PENDING",
  reviewNote: "",
  assignDepartmentId: "",
};

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
  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [review, setReview] = useState<{ app: Application; approve: boolean } | null>(null);
  const [reviewDeptId, setReviewDeptId] = useState("");
  const [note, setNote] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [draft, setDraft] = useState<AppManageDraft>(EMPTY_APP_DRAFT);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const canApprove = session.canInClub("application.approve", clubId) || session.canInClub("application.review", clubId);
  const canReject = session.canInClub("application.reject", clubId) || session.canInClub("application.review", clubId);
  const canUpdate = session.canInClub("application.update", clubId) || session.canInClub("application.review", clubId) || canApprove || canReject;
  const canDelete = session.canInClub("application.delete", clubId) || session.canInClub("application.review", clubId) || canApprove;

  const apps = useQuery({
    queryKey: ["club-applications", clubId, statusFilter, search],
    queryFn: () =>
      apiModel.clubApplications(clubId, {
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      }),
    enabled: !!clubId,
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
  };

  const reviewMutation = useMutation({
    mutationFn: ({ app, approve }: { app: Application; approve: boolean }) =>
      approve
        ? apiModel.approve(clubId, app.id, note, reviewDeptId || undefined)
        : apiModel.reject(clubId, app.id, note),
    onSuccess: (_, { approve }) => {
      onNotice(
        approve
          ? `Đã duyệt đơn, thêm thành viên CLB${reviewDeptId ? " và phân vào Ban" : ""}.`
          : "Đã từ chối đơn đăng ký."
      );
      onError("");
      setReview(null);
      setNote("");
      setReviewDeptId("");
      setDetailApp(null);
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
          status: draft.status,
          reviewNote: draft.reviewNote.trim(),
          assignDepartmentId: draft.assignDepartmentId || undefined,
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
      return apiModel.clubApplicationDetail(clubId, saved.id);
    },
    onSuccess: (updated) => {
      onNotice(
        modalMode === "edit"
          ? "Đã cập nhật hồ sơ đơn đăng ký & kết quả xét duyệt."
          : "Đã tạo hồ sơ đơn đăng ký mới."
      );
      onError("");
      setModalMode(null);
      setEditingApp(null);
      setPendingFiles([]);
      if (detailApp?.id === updated.id) setDetailApp(updated);
      refreshApps();
      onRefreshMembers();
    },
    onError: (e) => onError(describeError(e)),
  });

  const deleteAppMutation = useMutation({
    mutationFn: (appId: string) => apiModel.deleteClubApplication(clubId, appId),
    onSuccess: () => {
      onNotice("Đã xoá đơn đăng ký.");
      onError("");
      setDetailApp(null);
      refreshApps();
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
      if (detailApp?.id === updated.id) setDetailApp(updated);
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
      if (detailApp?.id === updated.id) setDetailApp(updated);
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
    setNote("");
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
      status: (app.status as AppManageDraft["status"]) || "PENDING",
      reviewNote: app.reviewNote || "",
      assignDepartmentId: app.preferredDepartmentId || "",
    });
    setPendingFiles([]);
    saveAppMutation.reset();
    setModalMode("edit");
  };

  return (
    <div className="space-y-3">
      {/* Thanh Tìm kiếm, Lọc trạng thái & Nút Tạo hồ sơ đơn (CRUD) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email ứng viên…"
            className="pl-8 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Lọc trạng thái đơn"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-48 text-xs"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">PENDING — Chờ duyệt</option>
            <option value="APPROVED">APPROVED — Đã duyệt</option>
            <option value="REJECTED">REJECTED — Đã từ chối</option>
            <option value="CANCELLED">CANCELLED — Đã rút</option>
          </Select>
          {canUpdate && (
            <Button size="sm" onClick={openCreateApp}>
              <Plus size={14} /> Tạo hồ sơ đơn
            </Button>
          )}
        </div>
      </div>

      {apps.isPending ? (
        <LoadingRows />
      ) : apps.isError ? (
        <ErrorState message={describeError(apps.error)} onRetry={() => apps.refetch()} />
      ) : !apps.data.items.length ? (
        <EmptyState
          icon={<ClipboardList />}
          title="Chưa có đơn đăng ký phù hợp"
          description="Bạn có thể tạo hồ sơ đơn trực tiếp cho ứng viên hoặc đợi ứng viên nộp đơn."
          actionLabel={canUpdate ? "Tạo hồ sơ đơn" : undefined}
          onAction={canUpdate ? openCreateApp : undefined}
        />
      ) : (
        <DataTable
          ariaLabel="Đơn đăng ký"
          rows={apps.data.items}
          rowKey={(a) => a.id}
          onRowClick={setDetailApp}
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
                    { icon: <Eye />, label: "Xem chi tiết & tệp", onClick: () => setDetailApp(a) },
                    ...(canUpdate
                      ? [
                          {
                            icon: <Pencil />,
                            label: "Chỉnh sửa đơn & kết quả duyệt",
                            onClick: () => openEditApp(a),
                          },
                        ]
                      : []),
                    ...(a.status === "PENDING" && canApprove
                      ? [{ icon: <Check />, label: "Duyệt nhanh", onClick: () => openReview(a, true) }]
                      : []),
                    ...(a.status === "PENDING" && canReject
                      ? [
                          {
                            icon: <X />,
                            label: "Từ chối nhanh",
                            danger: true,
                            onClick: () => openReview(a, false),
                          },
                        ]
                      : []),
                    ...(canDelete
                      ? [
                          {
                            icon: <Trash2 />,
                            label: "Xoá đơn",
                            danger: true,
                            onClick: () =>
                              confirm(`Xoá đơn của ${a.applicantName || "ứng viên"}?`) &&
                              deleteAppMutation.mutate(a.id),
                            disabled: deleteAppMutation.isPending,
                          },
                        ]
                      : []),
                  ]}
                />
              ),
            },
          ]}
        />
      )}

      {/* Modal Duyệt / Từ chối nhanh */}
      <ModalShell
        open={!!review}
        onClose={() => setReview(null)}
        title={review?.approve ? "Duyệt đơn đăng ký" : "Từ chối đơn đăng ký"}
        icon={review?.approve ? <Check /> : <X />}
        size="sm"
        onSubmit={() => review && reviewMutation.mutate(review)}
        submitLabel={review?.approve ? "Duyệt & Thêm thành viên" : "Từ chối"}
        submitDanger={!review?.approve}
        submitLoading={reviewMutation.isPending}
        submitDisabled={!note.trim()}
      >
        {review && (
          <p className="text-sm">
            <b>{review.app.applicantName ?? nameOf(review.app.applicantId)?.fullName ?? "Người nộp"}</b> —{" "}
            <span className="text-muted-foreground">{review.app.message}</span>
          </p>
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
        <FormField label="Ghi chú xét duyệt" required>
          <Textarea
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Lý do hoặc lời nhắn chào mừng gửi tới người nộp…"
          />
        </FormField>
        {reviewMutation.error && <p className="text-xs text-destructive">{describeError(reviewMutation.error)}</p>}
      </ModalShell>

      {/* Modal Tạo mới / Chỉnh sửa Hồ sơ đơn & Kết quả xét duyệt (CRUD) */}
      <ModalShell
        open={modalMode !== null}
        onClose={() => {
          setModalMode(null);
          setEditingApp(null);
          setPendingFiles([]);
        }}
        title={
          modalMode === "edit"
            ? "Chỉnh sửa hồ sơ đơn & Kết quả xét duyệt"
            : "Tạo hồ sơ đơn đăng ký mới"
        }
        icon={<ClipboardList />}
        size="lg"
        onSubmit={() => saveAppMutation.mutate()}
        submitLabel={modalMode === "edit" ? "Lưu thay đổi & Kết quả duyệt" : "Tạo hồ sơ đơn"}
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

          {modalMode === "edit" && (
            <div className="grid gap-3 rounded-lg border border-primary/25 bg-primary/[0.04] p-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Kết quả xét duyệt & Phân ban
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Trạng thái xét duyệt" required>
                  <Select
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({ ...draft, status: e.target.value as AppManageDraft["status"] })
                    }
                  >
                    <option value="PENDING">PENDING — Đang chờ xét duyệt</option>
                    <option value="APPROVED">APPROVED — Đã duyệt (Thêm làm thành viên CLB)</option>
                    <option value="REJECTED">REJECTED — Đã từ chối</option>
                    <option value="CANCELLED">CANCELLED — Đã huỷ / Rút đơn</option>
                  </Select>
                </FormField>
                {draft.status === "APPROVED" && activeDepartments.length > 0 && (
                  <FormField label="Phân vào Ban khi duyệt">
                    <Select
                      value={draft.assignDepartmentId}
                      onChange={(e) => setDraft({ ...draft, assignDepartmentId: e.target.value })}
                    >
                      <option value="">— Không phân ban / Giữ nguyên —</option>
                      {activeDepartments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                )}
              </div>
              <FormField label="Ghi chú xét duyệt (Review Note)">
                <Textarea
                  rows={2}
                  value={draft.reviewNote}
                  onChange={(e) => setDraft({ ...draft, reviewNote: e.target.value })}
                  placeholder="Ghi chú của Ban chủ nhiệm / Người duyệt đơn…"
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
        open={!!detailApp}
        onClose={() => setDetailApp(null)}
        title="Chi tiết đơn đăng ký"
        subtitle={clubName}
        icon={<ClipboardList />}
        footer={
          detailApp ? (
            <div className="flex flex-wrap items-center gap-2">
              {canUpdate && (
                <Button variant="outline" size="sm" onClick={() => openEditApp(detailApp)}>
                  <Pencil size={14} /> Chỉnh sửa đơn & Kết quả duyệt
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
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteAppMutation.isPending}
                  onClick={() =>
                    confirm(`Xoá vĩnh viễn đơn của ${detailApp.applicantName || "ứng viên"}?`) &&
                    deleteAppMutation.mutate(detailApp.id)
                  }
                >
                  <Trash2 size={14} /> Xoá đơn
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        {detailApp && (
          <>
            <DetailList
              rows={[
                ["Người nộp", applicant(detailApp)],
                ["Trạng thái", <StatusBadge key="s" status={detailApp.status} />],
                ["Ngày gửi", formatDateTime(detailApp.createdAt)],
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
                ["Ghi chú xét duyệt", detailApp.reviewNote || "—"],
              ]}
            />

            {detailApp.customAnswers && Object.keys(detailApp.customAnswers).length > 0 && (
              <Section title="Câu trả lời riêng của CLB" icon={<ClipboardList />}>
                <DetailList
                  rows={Object.entries(detailApp.customAnswers).map(([k, v]) => [
                    k,
                    String(v ?? "—"),
                  ])}
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
        )}
      </EntityDrawer>
    </div>
  );
}
