"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ClipboardList, FilterX, Lock, Paperclip, Pencil, Plus, Search, Upload, X } from "lucide-react";
import { apiModel, Application, ApplicationForm } from "@/lib/api";
import { ApplicationFilesList } from "@/components/shared/ApplicationFileView";
import { ApplicationDetailInfoList } from "@/components/shared/ApplicationFormFields";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

export function ClubApplicationsFilterBar({
  search,
  onSearchChange,
  createdFrom,
  onCreatedFromChange,
  createdTo,
  onCreatedToChange,
  statusFilter,
  onStatusFilterChange,
  hasFilters,
  onClearFilters,
  canCreateForClub,
  onCreateApp,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  createdFrom: string;
  onCreatedFromChange: (v: string) => void;
  createdTo: string;
  onCreatedToChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  canCreateForClub: boolean;
  onCreateApp: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 pt-3 sm:px-6">
      <div className="relative min-w-52 flex-1 sm:max-w-xs">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
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
          onChange={(e) => onCreatedFromChange(e.target.value)}
          className="h-9 w-36 text-xs"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="date"
          aria-label="Đến ngày"
          title="Lọc đơn gửi đến ngày"
          value={createdTo}
          onChange={(e) => onCreatedToChange(e.target.value)}
          className="h-9 w-36 text-xs"
        />
        <Select
          aria-label="Lọc trạng thái đơn"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="h-9 w-48 text-xs"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">PENDING — Chờ duyệt</option>
          <option value="APPROVED">APPROVED — Đã duyệt</option>
          <option value="REJECTED">REJECTED — Đã từ chối</option>
          <option value="CANCELLED">CANCELLED — Đã rút</option>
        </Select>
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <FilterX size={14} /> Xoá bộ lọc
          </Button>
        )}
        {canCreateForClub && (
          <Button size="sm" onClick={onCreateApp}>
            <Plus size={14} /> Tạo hồ sơ đơn
          </Button>
        )}
      </div>
    </div>
  );
}

export function ApplicationDetailDrawer({
  clubId,
  clubName,
  selectedAppId,
  onClose,
  canViewDetail,
  canUpdate,
  canApprove,
  canReject,
  activeForm,
  renderApplicant,
  onOpenEdit,
  onOpenReview,
  onFilesChanged,
  onError,
}: {
  clubId: string;
  clubName?: string;
  selectedAppId: string | null;
  onClose: () => void;
  canViewDetail: boolean;
  canUpdate: boolean;
  canApprove: boolean;
  canReject: boolean;
  activeForm?: ApplicationForm | null;
  renderApplicant: (app: Application) => React.ReactNode;
  onOpenEdit: (app: Application) => void;
  onOpenReview: (app: Application, approve: boolean) => void;
  onFilesChanged: (updated: Application, notice: string) => void;
  onError: (msg: string) => void;
}) {
  const detailQuery = useQuery({
    queryKey: ["club-application-detail", clubId, selectedAppId],
    queryFn: () => apiModel.clubApplicationDetail(clubId, selectedAppId!),
    enabled: !!clubId && !!selectedAppId && canViewDetail,
  });

  const uploadInlineMutation = useMutation({
    mutationFn: async ({ appId, files }: { appId: string; files: File[] }) => {
      for (const file of files) {
        await apiModel.uploadApplicationFile(appId, file, "APPLICANT_ATTACHMENT");
      }
      return apiModel.clubApplicationDetail(clubId, appId);
    },
    onSuccess: (updated) => {
      onFilesChanged(updated, "Đã tải thêm tệp đính kèm cho đơn đăng ký.");
      detailQuery.refetch();
    },
    onError: (e) => onError(describeError(e)),
  });

  const deleteFileMutation = useMutation({
    mutationFn: async ({ appId, fileId }: { appId: string; fileId: string }) => {
      await apiModel.deleteApplicationFile(appId, fileId);
      return apiModel.clubApplicationDetail(clubId, appId);
    },
    onSuccess: (updated) => {
      onFilesChanged(updated, "Đã xoá tệp đính kèm khỏi đơn đăng ký.");
      detailQuery.refetch();
    },
    onError: (e) => onError(describeError(e)),
  });

  const detailApp = detailQuery.data;

  return (
    <EntityDrawer
      open={!!selectedAppId}
      onClose={onClose}
      title="Chi tiết đơn đăng ký"
      subtitle={clubName}
      icon={<ClipboardList />}
      footer={
        detailApp ? (
          <div className="flex flex-wrap items-center gap-2">
            {canUpdate && (
              <Button variant="outline" size="sm" onClick={() => onOpenEdit(detailApp)}>
                <Pencil size={14} /> Chỉnh sửa hồ sơ & ghi chú
              </Button>
            )}
            {detailApp.status === "PENDING" && (
              <>
                {canReject && (
                  <Button variant="destructive" size="sm" onClick={() => onOpenReview(detailApp, false)}>
                    <X size={14} /> Từ chối
                  </Button>
                )}
                {canApprove && (
                  <Button size="sm" onClick={() => onOpenReview(detailApp, true)}>
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
            <ApplicationDetailInfoList
              application={detailApp}
              leadingRows={[["Người nộp", renderApplicant(detailApp)]]}
              trailingRows={[
                [
                  "Ghi chú nội bộ BCN",
                  detailApp.internalNote ? (
                    <span
                      key="inote"
                      className="inline-flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"
                    >
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
                    const label = activeForm?.fields.find((f) => f.key === k)?.label || k;
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
                  canUpdate ? (f) => deleteFileMutation.mutate({ appId: detailApp.id, fileId: f.id }) : undefined
                }
              />
            </Section>
          </>
        )
      )}
    </EntityDrawer>
  );
}
