"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Eye, Paperclip, Pencil, Trash2, Upload, XCircle } from "lucide-react";
import { apiModel, Application, ApplicationSummary } from "@/lib/api";
import { ApplicationFilesList, CustomFieldsInputs } from "@/components/shared/ApplicationFileView";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";

function inferCategory(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "APPLICANT_DOC";
  if (lower.endsWith(".pdf")) return "APPLICANT_CV_PDF";
  return "APPLICANT_IMAGE";
}

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Application | null>(null);
  const [notice, setNotice] = useState("");

  const list = useQuery({ queryKey: ["my-applications"], queryFn: apiModel.myApplications });
  const detail = useQuery({
    queryKey: ["my-applications", selectedId],
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
    if (selectedId) queryClient.invalidateQueries({ queryKey: ["my-applications", selectedId] });
  };

  const cancel = useMutation({
    mutationFn: (id: string) => apiModel.cancelApplication(id),
    onSuccess: (app) => {
      setNotice(`Đã huỷ đơn vào ${app.clubName}.`);
      refreshAll();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiModel.deleteMyApplication(id),
    onSuccess: () => {
      setNotice("Đã xoá đơn đăng ký khỏi danh sách.");
      setSelectedId(null);
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

  const confirmCancel = (app: ApplicationSummary) => {
    if (confirm(`Huỷ đơn đăng ký vào ${app.clubName}?`)) cancel.mutate(app.id);
  };
  const confirmDelete = (app: ApplicationSummary) => {
    if (confirm(`Xoá vĩnh viễn đơn đăng ký vào ${app.clubName}?`)) remove.mutate(app.id);
  };

  const openEdit = (app: Application) => {
    setEditing({ ...app, customAnswers: { ...(app.customAnswers ?? {}) } });
    update.reset();
  };

  const err = cancel.error || remove.error || uploadFile.error || deleteFile.error;
  const departments = clubForm.data?.departments ?? [];

  return (
    <ListPage title="Đơn đăng ký của tôi">
      <BreadcrumbToolbar
        crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Câu lạc bộ" }, { label: "Đơn đăng ký của tôi" }]}
        titleBadge={<CountBadge>{list.data?.total ?? 0}</CountBadge>}
        onRefresh={() => list.refetch()}
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      {err && <Notice tone="error">{describeError(err)}</Notice>}

      {list.isPending ? (
        <LoadingRows />
      ) : list.isError ? (
        <ErrorState message={describeError(list.error)} onRetry={() => list.refetch()} />
      ) : !list.data.items.length ? (
        <EmptyState icon={<ClipboardList />} title="Bạn chưa gửi đơn nào" description="Vào Khám phá CLB để chọn CLB phù hợp và điền biểu mẫu ứng tuyển." />
      ) : (
        <DataTable
          ariaLabel="Đơn đăng ký"
          rows={list.data.items}
          rowKey={(a) => a.id}
          onRowClick={(a) => setSelectedId(a.id)}
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
            { key: "reviewed", header: "Ngày xét duyệt", render: (a) => <span className="font-mono">{formatDay(a.reviewedAt)}</span> },
            {
              key: "actions",
              header: "Thao tác",
              className: "text-right",
              render: (a) => (
                <TableRowActions
                  actions={[
                    { icon: <Eye />, label: "Xem & sửa đơn", onClick: () => setSelectedId(a.id) },
                    ...(a.status === "PENDING"
                      ? [{ icon: <XCircle />, label: "Huỷ đơn", danger: true, onClick: () => confirmCancel(a), disabled: cancel.isPending }]
                      : []),
                    ...(a.status !== "APPROVED"
                      ? [{ icon: <Trash2 />, label: "Xoá đơn", danger: true, onClick: () => confirmDelete(a), disabled: remove.isPending }]
                      : []),
                  ]}
                />
              ),
            },
          ]}
        />
      )}

      <EntityDrawer
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={detail.data?.clubName ?? "Đơn đăng ký"}
        subtitle={detail.data?.clubCode}
        icon={<ClipboardList />}
        footer={
          detail.data ? (
            <div className="flex flex-wrap items-center gap-2">
              {detail.data.status === "PENDING" && (
                <>
                  <Button variant="outline" size="sm" onClick={() => openEdit(detail.data!)}>
                    <Pencil size={14} /> Chỉnh sửa đơn
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => confirmCancel(detail.data!)}>
                    <XCircle size={14} /> Huỷ đơn
                  </Button>
                </>
              )}
              {detail.data.status !== "APPROVED" && (
                <Button variant="destructive" size="sm" onClick={() => confirmDelete(detail.data!)}>
                  <Trash2 size={14} /> Xoá đơn
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        {detail.isPending ? (
          <LoadingRows rows={4} />
        ) : (
          detail.data && (
            <>
              <DetailList
                rows={[
                  ["Trạng thái", <StatusBadge key="s" status={detail.data.status} />],
                  ["Ngày gửi", formatDateTime(detail.data.createdAt)],
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
                  ["Ghi chú từ CLB", detail.data.reviewNote || "—"],
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
