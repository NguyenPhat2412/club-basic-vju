"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  FilePlus2,
  FilterX,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  apiModel,
  ApplicationForm,
  UpsertApplicationFormInput,
} from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EMPTY_FORM_DRAFT } from "@/forms/application/application-form";
import { FormBuilderModal } from "@/components/application/FormBuilderModal";
import { FormInspectDrawer } from "@/components/application/FormInspectDrawer";
import { formatDay, validateApplicationFile } from "@/lib/utils";

export function FormsTab({
  clubId,
  clubName,
  onNotice,
  onError,
}: {
  clubId: string;
  clubName?: string;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const canManageForm =
    session.canInClub("application.manage_form", clubId) ||
    session.canInClub("application.review", clubId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [inspectFormId, setInspectFormId] = useState<string | null>(null);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formDraft, setFormDraft] = useState<UpsertApplicationFormInput>(EMPTY_FORM_DRAFT);

  const forms = useQuery({
    queryKey: ["club-application-forms", clubId],
    queryFn: () => apiModel.clubApplicationForms(clubId),
    enabled: !!clubId,
  });

  const refreshForms = () => {
    queryClient.invalidateQueries({ queryKey: ["club-application-forms", clubId] });
    queryClient.invalidateQueries({ queryKey: ["club-application-form", clubId] });
  };

  const deleteFormMutation = useMutation({
    mutationFn: (formId: string) => apiModel.deleteClubApplicationForm(clubId, formId),
    onSuccess: () => {
      onNotice("Đã xoá biểu mẫu đơn đăng ký.");
      onError("");
      setInspectFormId(null);
      refreshForms();
    },
    onError: (e) => onError(describeError(e)),
  });

  const uploadFormFileMutation = useMutation({
    mutationFn: async ({ formId, files, category }: { formId: string; files: File[]; category: string }) => {
      for (const file of files) {
        const err = validateApplicationFile(file);
        if (err) throw new Error(err);
      }
      for (const file of files) {
        await apiModel.uploadFormFile(clubId, formId, file, category);
      }
    },
    onSuccess: () => {
      onNotice("Đã tải lên tệp biểu mẫu / poster của CLB.");
      onError("");
      refreshForms();
    },
    onError: (e) => onError(describeError(e)),
  });

  const deleteFormFileMutation = useMutation({
    mutationFn: ({ formId, fileId }: { formId: string; fileId: string }) =>
      apiModel.deleteFormFile(clubId, formId, fileId),
    onSuccess: () => {
      onNotice("Đã xoá tệp khỏi biểu mẫu.");
      onError("");
      refreshForms();
    },
    onError: (e) => onError(describeError(e)),
  });

  const openCreateForm = () => {
    setEditingFormId(null);
    setFormDraft({
      ...EMPTY_FORM_DRAFT,
      title: `Đơn đăng ký tuyển thành viên ${clubName ?? ""}`.trim(),
      description:
        "Vui lòng điền đầy đủ thông tin cá nhân, chọn Ban nguyện vọng và đính kèm Đơn đăng ký (.doc/.docx), CV (.pdf) hoặc hình ảnh minh chứng.",
      fields: [
        {
          key: "interview_slot",
          label: "Khung giờ bạn có thể tham gia phỏng vấn",
          type: "SELECT",
          required: false,
          placeholder: "Chọn khung giờ phù hợp",
          options: [
            "Sáng Thứ 7 (08:30 - 11:30)",
            "Chiều Thứ 7 (14:00 - 17:00)",
            "Sáng Chủ Nhật (08:30 - 11:30)",
            "Buổi tối trong tuần (Online)",
          ],
        },
      ],
    });
    setFormModalOpen(true);
  };

  const openEditForm = (form: ApplicationForm) => {
    setEditingFormId(form.id || null);
    setFormDraft({
      title: form.title,
      description: form.description || "",
      status: form.status,
      openAt: form.openAt,
      closeAt: form.closeAt,
      fields: form.fields ? form.fields.map((f) => ({ ...f, options: [...(f.options ?? [])] })) : [],
      allowAttachments: form.allowAttachments,
      requireAttachment: form.requireAttachment,
      maxAttachments: form.maxAttachments,
      isDefault: form.isDefault,
    });
    setFormModalOpen(true);
  };

  const allForms = useMemo(() => forms.data ?? [], [forms.data]);
  const filteredForms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allForms.filter((f) => {
      if (statusFilter && f.status !== statusFilter) return false;
      if (!q) return true;
      return (
        f.title.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [allForms, search, statusFilter]);

  const pagedForms = useMemo(
    () => filteredForms.slice(offset, offset + limit),
    [filteredForms, offset, limit]
  );
  const inspectedForm = allForms.find((f) => (f.id || f.title) === inspectFormId) ?? null;
  const hasFilters = Boolean(search.trim() || statusFilter);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setOffset(0);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-card px-4 py-2.5 sm:px-6">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[210px] flex-1 sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder="Tìm theo tên hoặc mô tả biểu mẫu…" className="h-8 pl-8 pr-7 text-xs" />
            {search && (
              <button type="button" aria-label="Xoá tìm kiếm" onClick={() => { setSearch(""); setOffset(0); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>
          <Select aria-label="Lọc trạng thái biểu mẫu" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }} className="h-8 w-full text-xs sm:w-44">
            <option value="">Mọi trạng thái</option>
            <option value="OPEN">OPEN — Đang mở đơn</option>
            <option value="DRAFT">DRAFT — Bản nháp</option>
            <option value="CLOSED">CLOSED — Đã đóng đơn</option>
          </Select>
          {hasFilters && <Button variant="outline" size="sm" onClick={resetFilters} className="h-8"><FilterX size={13} /> Xoá lọc</Button>}
        </div>
        {canManageForm && <Button size="sm" onClick={openCreateForm} className="h-8"><Plus size={14} /> Tạo biểu mẫu đơn</Button>}
      </div>

      {forms.isPending ? (
        <LoadingRows />
      ) : forms.isError ? (
        <ErrorState message={describeError(forms.error)} onRetry={() => forms.refetch()} />
      ) : !filteredForms.length ? (
        <EmptyState
          icon={<FilePlus2 />}
          title={hasFilters ? "Không có biểu mẫu khớp bộ lọc" : "CLB chưa có biểu mẫu đơn đăng ký riêng"}
          description="Tạo biểu mẫu đơn để cấu hình câu hỏi tuỳ chỉnh và tải lên file đơn mẫu (.docx, .pdf) hoặc ảnh poster tuyển thành viên."
          actionLabel={hasFilters ? "Xoá bộ lọc" : canManageForm ? "Tạo biểu mẫu đầu tiên" : undefined}
          onAction={hasFilters ? resetFilters : canManageForm ? openCreateForm : undefined}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Danh sách biểu mẫu ứng tuyển"
            minWidth="min-w-[780px]"
            rows={pagedForms}
            rowKey={(f) => f.id || f.title}
            onRowClick={(f) => setInspectFormId(f.id || f.title)}
            columns={[
              {
                key: "index",
                header: "STT",
                className: "w-10 text-center font-mono text-muted-foreground",
                render: (f) => <span>{offset + pagedForms.indexOf(f) + 1}</span>,
              },
              {
                key: "title",
                header: "Tên biểu mẫu tuyển quân",
                className: "min-w-[230px] max-w-[320px]",
                sortValue: (f) => f.title,
                render: (f) => (
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-bold text-foreground" title={f.title}>
                        {f.title}
                      </p>
                      {f.isDefault && (
                        <Badge tone="primary" dot={false}>
                          Mặc định
                        </Badge>
                      )}
                      {f.requireAttachment && (
                        <Badge tone="danger" dot={false}>
                          Bắt buộc tệp
                        </Badge>
                      )}
                    </div>
                    {f.description && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{f.description}</p>
                    )}
                  </div>
                ),
              },
              {
                key: "status",
                header: "Trạng thái",
                className: "whitespace-nowrap",
                sortValue: (f) => f.status,
                render: (f) => <StatusBadge status={f.status} />,
              },
              {
                key: "window",
                header: "Thời hạn nhận đơn",
                className: "whitespace-nowrap font-mono text-muted-foreground",
                render: (f) =>
                  f.openAt || f.closeAt ? (
                    <span>
                      {f.openAt ? formatDay(f.openAt) : "Mở ngay"} → {f.closeAt ? formatDay(f.closeAt) : "Không hạn"}
                    </span>
                  ) : (
                    <span>Mở xuyên suốt</span>
                  ),
              },
              {
                key: "questions",
                header: "Câu hỏi tuỳ chỉnh",
                className: "whitespace-nowrap",
                sortValue: (f) => f.fields?.length ?? 0,
                render: (f) => (
                  <span className="font-mono font-semibold text-foreground">
                    {f.fields?.length ?? 0} câu hỏi
                  </span>
                ),
              },
              {
                key: "files",
                header: "Tệp mẫu & Poster",
                className: "whitespace-nowrap",
                sortValue: (f) => f.templateFiles?.length ?? 0,
                render: (f) => (
                  <Badge tone={(f.templateFiles?.length ?? 0) > 0 ? "primary" : "neutral"} dot={false}>
                    {f.templateFiles?.length ?? 0} tệp
                  </Badge>
                ),
              },
              {
                key: "actions",
                header: "Thao tác",
                className: "text-right whitespace-nowrap",
                render: (f) => (
                  <TableRowActions
                    actions={[
                      {
                        icon: <Eye />,
                        label: "Câu hỏi & Tệp mẫu",
                        onClick: () => setInspectFormId(f.id || f.title),
                      },
                      ...(canManageForm
                        ? [
                            { icon: <Pencil />, label: "Chỉnh sửa", onClick: () => openEditForm(f) },
                            ...(f.id
                              ? [
                                  {
                                    icon: <Trash2 />,
                                    label: "Xoá biểu mẫu",
                                    danger: true,
                                    disabled: deleteFormMutation.isPending,
                                    onClick: () =>
                                      confirm(`Xoá biểu mẫu "${f.title}"?`) && deleteFormMutation.mutate(f.id!),
                                  },
                                ]
                              : []),
                          ]
                        : []),
                    ]}
                  />
                ),
              },
            ]}
          />
          <Pagination
            offset={offset}
            limit={limit}
            total={filteredForms.length}
            onOffset={setOffset}
            onLimit={setLimit}
          />
        </>
      )}

      <FormInspectDrawer
        form={inspectedForm}
        canManageForm={canManageForm}
        deletingFile={deleteFormFileMutation.isPending}
        onClose={() => setInspectFormId(null)}
        onEdit={openEditForm}
        onUploadFiles={(formId, files, category) =>
          uploadFormFileMutation.mutate({ formId, files, category })
        }
        onDeleteFile={(formId, fileId) =>
          deleteFormFileMutation.mutate({ formId, fileId })
        }
      />

      <FormBuilderModal
        clubId={clubId}
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingFormId(null);
        }}
        editingFormId={editingFormId}
        formDraft={formDraft}
        setFormDraft={setFormDraft}
        onSaved={(saved, isEdit) => {
          onNotice(isEdit ? `Đã cập nhật biểu mẫu "${saved.title}".` : `Đã tạo biểu mẫu "${saved.title}".`);
          onError("");
          refreshForms();
        }}
        onError={onError}
      />
    </div>
  );
}
