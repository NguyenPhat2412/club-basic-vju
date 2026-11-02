"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Eye, FilterX, Paperclip, Pencil, Upload, XCircle } from "lucide-react";
import { apiModel, Application, ApplicationSummary } from "@/lib/api";
import { ApplicationFilesList, CustomFieldsInputs } from "@/components/shared/ApplicationFileView";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";

const LIMIT = 20;

function inferCategory(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "APPLICANT_DOC";
  if (lower.endsWith(".pdf")) return "APPLICANT_CV_PDF";
  return "APPLICANT_IMAGE";
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <ApplicationsPageContent />
    </Suspense>
  );
}

function ApplicationsPageContent() {
  const searchParams = useSearchParams();
  const urlAppId = searchParams.get("applicationId");
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("");
  const [clubFilter, setClubFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);
  const [dismissedUrlId, setDismissedUrlId] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState<ApplicationSummary | null>(null);
  const [editing, setEditing] = useState<Application | null>(null);
  const [notice, setNotice] = useState("");

  const selectedId = manualSelectedId ?? (urlAppId && urlAppId !== dismissedUrlId ? urlAppId : null);

  const openDrawer = (id: string) => setManualSelectedId(id);
  const closeDrawer = () => {
    setManualSelectedId(null);
    if (urlAppId) setDismissedUrlId(urlAppId);
  };

  const list = useQuery({
    queryKey: ["my-applications", statusFilter, clubFilter, offset],
    queryFn: () =>
      apiModel.myApplications({
        status: statusFilter || undefined,
        clubId: clubFilter || undefined,
        offset,
        limit: LIMIT,
      }),
    placeholderData: keepPreviousData,
  });

  const clubsCatalog = useQuery({
    queryKey: ["public-clubs", "filter-options"],
    queryFn: () => apiModel.publicClubs("", "", 0, 100),
    staleTime: 60_000,
  });

  const clubOptions = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    for (const c of clubsCatalog.data?.items ?? []) {
      map.set(c.id, { id: c.id, code: c.code, name: c.name });
    }
    for (const a of list.data?.items ?? []) {
      if (!map.has(a.clubId)) {
        map.set(a.clubId, { id: a.clubId, code: a.clubCode, name: a.clubName });
      }
    }
    return Array.from(map.values());
  }, [clubsCatalog.data, list.data]);

  const detail = useQuery({
    queryKey: ["my-applications", "detail", selectedId],
    queryFn: () => apiModel.application(selectedId!),
    enabled: !!selectedId,
  });

  const activeClubId = detail.data?.clubId || editing?.clubId;
  const clubForm = useQuery({
    queryKey: ["club-application-form", activeClubId],
    queryFn: () => apiModel.clubApplicationForm(activeClubId!),
    enabled: !!activeClubId,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "my-applications"] });
  };

  const cancel = useMutation({
    mutationFn: (id: string) => apiModel.cancelApplication(id),
    onSuccess: (app) => {
      setNotice(`Đã huỷ đơn đăng ký vào ${app.clubName}. Lịch sử đơn được lưu ở trạng thái Đã rút.`);
      setConfirmingCancel(null);
      refreshAll();
    },
  });

  const update = useMutation({
    mutationFn: (app: Application) =>
      apiModel.updateMyApplication(app.id, {
        preferredDepartmentId: app.preferredDepartmentId || undefined,
        secondaryDepartmentId: app.secondaryDepartmentId || undefined,
        applicantPhone: app.applicantPhone ?? "",
        facultyMajor: app.facultyMajor ?? "",
        academicYear: app.academicYear ?? "",
        gpa: app.gpa ?? "",
        socialPortfolioUrl: app.socialPortfolioUrl ?? "",
        selfIntroduction: app.selfIntroduction ?? "",
        skillsExperience: app.skillsExperience ?? "",
        availability: app.availability ?? "",
        message: app.message,
        customAnswers: app.customAnswers ?? {},
      }),
    onSuccess: (app) => {
      setNotice(`Đã cập nhật thông tin đơn đăng ký vào ${app.clubName}.`);
      setEditing(null);
      refreshAll();
    },
  });

  const uploadFile = useMutation({
    mutationFn: async ({ appId, files }: { appId: string; files: File[] }) => {
      for (const file of files) {
        await apiModel.uploadApplicationFile(appId, file, inferCategory(file.name));
      }
    },
    onSuccess: () => {
      setNotice("Đã tải lên tệp đính kèm.");
      refreshAll();
    },
  });

  const deleteFile = useMutation({
    mutationFn: ({ appId, fileId }: { appId: string; fileId: string }) =>
      apiModel.deleteApplicationFile(appId, fileId),
    onSuccess: () => {
      setNotice("Đã xoá tệp đính kèm.");
      refreshAll();
    },
  });

  const openEdit = (app: Application) => {
    setEditing({ ...app, customAnswers: { ...(app.customAnswers ?? {}) } });
    update.reset();
  };

  const hasFilter = statusFilter !== "" || clubFilter !== "";
  const clearFilters = () => {
    setStatusFilter("");
    setClubFilter("");
    setOffset(0);
  };

  const err = cancel.error || uploadFile.error || deleteFile.error;
  const departments = clubForm.data?.departments ?? [];

  return (
    <ListPage title="Đơn đăng ký của tôi">
      <BreadcrumbToolbar
        crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Câu lạc bộ" }, { label: "Đơn đăng ký của tôi" }]}
        titleBadge={<CountBadge>{list.data?.total ?? 0}</CountBadge>}
        extraActions={
          <>
            <Select
              aria-label="Lọc theo câu lạc bộ"
              value={clubFilter}
              onChange={(e) => {
                setClubFilter(e.target.value);
                setOffset(0);
              }}
              className="h-9 w-full text-xs sm:w-52"
            >
              <option value="">Tất cả câu lạc bộ</option>
              {clubOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Lọc theo trạng thái đơn"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setOffset(0);
              }}
              className="h-9 w-full text-xs sm:w-44"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">PENDING — Chờ duyệt</option>
              <option value="APPROVED">APPROVED — Đã duyệt</option>
              <option value="REJECTED">REJECTED — Đã từ chối</option>
              <option value="CANCELLED">CANCELLED — Đã rút</option>
            </Select>
            {hasFilter && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <FilterX size={14} /> Xoá bộ lọc
              </Button>
            )}
          </>
        }
        onRefresh={() => {
          list.refetch();
          if (selectedId) detail.refetch();
        }}
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      {err && <Notice tone="error">{describeError(err)}</Notice>}

      {list.isPending ? (
        <LoadingRows />
      ) : list.isError ? (
        <ErrorState message={describeError(list.error)} onRetry={() => list.refetch()} />
      ) : !list.data.items.length ? (
        <EmptyState
          icon={<ClipboardList />}
          title={hasFilter ? "Không có đơn đăng ký khớp bộ lọc" : "Bạn chưa gửi đơn nào"}
          description={
            hasFilter
              ? "Hãy xoá bộ lọc trạng thái hoặc câu lạc bộ để xem toàn bộ lịch sử đơn đăng ký."
              : "Vào Khám phá CLB để chọn câu lạc bộ phù hợp và điền biểu mẫu ứng tuyển."
          }
          actionLabel={hasFilter ? "Xoá bộ lọc" : undefined}
          onAction={hasFilter ? clearFilters : undefined}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Đơn đăng ký"
            rows={list.data.items}
            rowKey={(a) => a.id}
            onRowClick={(a) => openDrawer(a.id)}
            columns={[
              { key: "date", header: "Ngày gửi", render: (a) => <span className="font-mono font-bold text-primary">{formatDay(a.createdAt)}</span> },
              {
                key: "club",
                header: "Câu lạc bộ",
                render: (a) => (
                  <div>
                    <p className="font-bold">{a.clubName}</p>
                    <code className="font-mono text-[10.5px] font-bold text-primary">{a.clubCode}</code>
                  </div>
                ),
              },
              {
                key: "dept",
                header: "Ban nguyện vọng",
                render: (a) => a.preferredDepartmentName ? <Badge tone="primary" dot={false}>{a.preferredDepartmentName}</Badge> : <span className="text-muted-foreground">—</span>,
              },
              {
                key: "major",
                header: "Ngành / Khóa",
                render: (a) => (
                  <span className="text-xs text-muted-foreground">
                    {[a.facultyMajor, a.academicYear].filter(Boolean).join(" · ") || "—"}
                  </span>
                ),
              },
              {
                key: "files",
                header: "Đính kèm",
                render: (a) =>
                  a.attachmentCount ? (
                    <Badge tone="neutral" dot={false}>
                      <Paperclip size={11} /> {a.attachmentCount} tệp
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
              { key: "status", header: "Trạng thái", render: (a) => <StatusBadge status={a.status} /> },
              {
                key: "processed",
                header: "Xét duyệt / Huỷ",
                render: (a) => (
                  <span className="font-mono text-xs">
                    {a.reviewedAt ? formatDay(a.reviewedAt) : a.cancelledAt ? formatDay(a.cancelledAt) : "—"}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Thao tác",
                className: "text-right",
                render: (a) => (
                  <TableRowActions
                    actions={[
                      { icon: <Eye />, label: "Xem chi tiết", onClick: () => openDrawer(a.id) },
                      ...(a.status === "PENDING"
                        ? [
                            {
                              icon: <XCircle />,
                              label: "Huỷ đơn",
                              danger: true,
                              onClick: () => {
                                cancel.reset();
                                setConfirmingCancel(a);
                              },
                              disabled: cancel.isPending,
                            },
                          ]
                        : []),
                    ]}
                  />
                ),
              },
            ]}
          />
          <Pagination offset={offset} limit={LIMIT} total={list.data.total} onOffset={setOffset} />
        </>
      )}

      <EntityDrawer
        open={!!selectedId}
        onClose={closeDrawer}
        title={detail.data?.clubName ?? "Đơn đăng ký"}
        subtitle={detail.data?.clubCode}
        icon={<ClipboardList />}
        footer={
          detail.data?.status === "PENDING" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(detail.data!)}>
                <Pencil size={14} /> Chỉnh sửa đơn
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  cancel.reset();
                  setConfirmingCancel(detail.data!);
                }}
              >
                <XCircle size={14} /> Huỷ đơn
              </Button>
            </div>
          ) : undefined
        }
      >
        {detail.isPending ? (
          <LoadingRows rows={4} />
        ) : detail.isError ? (
          <ErrorState message={describeError(detail.error)} onRetry={() => detail.refetch()} />
        ) : (
          detail.data && (
            <>
              <DetailList
                rows={[
                  ["Trạng thái", <StatusBadge key="s" status={detail.data.status} />],
                  ["Ngày gửi", formatDateTime(detail.data.createdAt)],
                  ...(detail.data.cancelledAt ? [["Ngày rút đơn", formatDateTime(detail.data.cancelledAt)] as [string, React.ReactNode]] : []),
                  ["Ban nguyện vọng 1", detail.data.preferredDepartmentName || "—"],
                  ["Ban nguyện vọng 2", detail.data.secondaryDepartmentName || "—"],
                  ["Số điện thoại", detail.data.applicantPhone || "—"],
                  ["Khoa / Ngành học", detail.data.facultyMajor || "—"],
                  ["Khóa / Năm học", detail.data.academicYear || "—"],
                  ["Điểm GPA", detail.data.gpa || "—"],
                  [
                    "Link FB / Portfolio",
                    detail.data.socialPortfolioUrl ? (
                      <a key="url" href={detail.data.socialPortfolioUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                        {detail.data.socialPortfolioUrl}
                      </a>
                    ) : (
                      "—"
                    ),
                  ],
                  ["Giới thiệu bản thân", <p key="intro" className="whitespace-pre-line">{detail.data.selfIntroduction || "—"}</p>],
                  ["Kỹ năng & Kinh nghiệm", <p key="skill" className="whitespace-pre-line">{detail.data.skillsExperience || "—"}</p>],
                  ["Thời gian tham gia", detail.data.availability || "—"],
                  ["Lý do ứng tuyển", <p key="m" className="whitespace-pre-line font-medium">{detail.data.message}</p>],
                  ["Ngày xét duyệt", formatDateTime(detail.data.reviewedAt)],
                  ["Phản hồi từ CLB", detail.data.reviewNote || "—"],
                ]}
              />

              {detail.data.customAnswers && Object.keys(detail.data.customAnswers).length > 0 && (
                <Section title="Câu trả lời riêng của CLB" icon={<ClipboardList />}>
                  <DetailList
                    rows={Object.entries(detail.data.customAnswers).map(([k, v]) => {
                      const label = clubForm.data?.fields.find((f) => f.key === k)?.label || k;
                      return [label, String(v ?? "—")];
                    })}
                  />
                </Section>
              )}

              <Section title={`Tệp đính kèm (${detail.data.attachments?.length ?? 0})`} icon={<Paperclip />}>
                {detail.data.status === "PENDING" && (
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] px-3 py-2">
                    <span className="text-xs text-muted-foreground">Bổ sung file .doc, .docx, .pdf hoặc ảnh minh chứng:</span>
                    <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:opacity-95">
                      <Upload size={13} /> {uploadFile.isPending ? "Đang tải..." : "Thêm tệp"}
                      <input
                        type="file"
                        multiple
                        accept=".doc,.docx,.pdf,.png,.jpg,.jpeg,.gif,.webp"
                        className="hidden"
                        disabled={uploadFile.isPending}
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (files.length && detail.data) {
                            uploadFile.mutate({ appId: detail.data.id, files });
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                )}
                <ApplicationFilesList
                  files={detail.data.attachments}
                  deleting={deleteFile.isPending}
                  onDelete={
                    detail.data.status === "PENDING"
                      ? (file) => deleteFile.mutate({ appId: detail.data!.id, fileId: file.id })
                      : undefined
                  }
                />
              </Section>
            </>
          )
        )}
      </EntityDrawer>

      <ModalShell
        open={!!confirmingCancel}
        onClose={() => setConfirmingCancel(null)}
        title="Xác nhận rút đơn đăng ký"
        icon={<XCircle />}
        size="sm"
        onSubmit={() => confirmingCancel && cancel.mutate(confirmingCancel.id)}
        submitLabel="Xác nhận huỷ đơn"
        submitDanger
        submitLoading={cancel.isPending}
      >
        {confirmingCancel && (
          <div className="space-y-2 text-sm">
            <p>
              Bạn có chắc chắn muốn huỷ đơn đăng ký vào <b>{confirmingCancel.clubName}</b>?
            </p>
            <p className="text-xs text-muted-foreground">
              Đơn sẽ chuyển sang trạng thái <b>Đã rút (CANCELLED)</b> và được giữ lại trong lịch sử hồ sơ. Bạn có thể nộp đơn mới nếu CLB còn mở tuyển.
            </p>
            {cancel.error && <p className="text-xs text-destructive">{describeError(cancel.error)}</p>}
          </div>
        )}
      </ModalShell>

      <ModalShell
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Chỉnh sửa đơn — ${editing?.clubName ?? ""}`}
        icon={<Pencil />}
        size="lg"
        onSubmit={() => editing && update.mutate(editing)}
        submitLabel="Lưu thay đổi"
        submitLoading={update.isPending}
        submitDisabled={!editing?.message?.trim()}
      >
        {editing && (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Số điện thoại">
                <Input value={editing.applicantPhone ?? ""} onChange={(e) => setEditing({ ...editing, applicantPhone: e.target.value })} />
              </FormField>
              <FormField label="Khoa / Ngành học">
                <Input value={editing.facultyMajor ?? ""} onChange={(e) => setEditing({ ...editing, facultyMajor: e.target.value })} />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Khóa / Năm học">
                <Input value={editing.academicYear ?? ""} onChange={(e) => setEditing({ ...editing, academicYear: e.target.value })} />
              </FormField>
              <FormField label="Điểm GPA">
                <Input value={editing.gpa ?? ""} onChange={(e) => setEditing({ ...editing, gpa: e.target.value })} />
              </FormField>
              <FormField label="Link FB / Portfolio">
                <Input value={editing.socialPortfolioUrl ?? ""} onChange={(e) => setEditing({ ...editing, socialPortfolioUrl: e.target.value })} />
              </FormField>
            </div>
            {departments.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Ban nguyện vọng 1">
                  <Select value={editing.preferredDepartmentId ?? ""} onChange={(e) => setEditing({ ...editing, preferredDepartmentId: e.target.value })}>
                    <option value="">— Chọn Ban nguyện vọng 1 —</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </Select>
                </FormField>
                <FormField label="Ban nguyện vọng 2">
                  <Select value={editing.secondaryDepartmentId ?? ""} onChange={(e) => setEditing({ ...editing, secondaryDepartmentId: e.target.value })}>
                    <option value="">— Chọn Ban nguyện vọng 2 —</option>
                    {departments.filter((d) => d.id !== editing.preferredDepartmentId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </Select>
                </FormField>
              </div>
            )}
            <FormField label="Giới thiệu bản thân">
              <Textarea rows={2} value={editing.selfIntroduction ?? ""} onChange={(e) => setEditing({ ...editing, selfIntroduction: e.target.value })} />
            </FormField>
            <FormField label="Kỹ năng & Kinh nghiệm">
              <Textarea rows={2} value={editing.skillsExperience ?? ""} onChange={(e) => setEditing({ ...editing, skillsExperience: e.target.value })} />
            </FormField>
            <FormField label="Thời gian tham gia">
              <Input value={editing.availability ?? ""} onChange={(e) => setEditing({ ...editing, availability: e.target.value })} />
            </FormField>
            <FormField label="Lý do & Động lực ứng tuyển" required>
              <Textarea rows={3} value={editing.message} onChange={(e) => setEditing({ ...editing, message: e.target.value })} />
            </FormField>
            {clubForm.data?.fields && clubForm.data.fields.length > 0 && (
              <CustomFieldsInputs
                fields={clubForm.data.fields}
                values={editing.customAnswers ?? {}}
                onChange={(k, v) =>
                  setEditing({
                    ...editing,
                    customAnswers: { ...(editing.customAnswers ?? {}), [k]: v },
                  })
                }
              />
            )}
            {update.error && <p className="text-xs text-destructive">{describeError(update.error)}</p>}
          </div>
        )}
      </ModalShell>
    </ListPage>
  );
}
