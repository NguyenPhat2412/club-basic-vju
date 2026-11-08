"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Eye, FilterX, Paperclip, XCircle } from "lucide-react";
import { apiModel, Application, ApplicationSummary } from "@/lib/api";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { formatDay } from "@/lib/utils";
import { inferApplicantCategory } from "@/forms/application/application-form";
import { MyApplicationOverlays } from "./MyApplicationOverlays";

const LIMIT = 20;

export function MyApplicationsView() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <MyApplicationsContent />
    </Suspense>
  );
}

function MyApplicationsContent() {
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
        await apiModel.uploadApplicationFile(appId, file, inferApplicantCategory(file.name));
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

      <MyApplicationOverlays
        selectedId={selectedId}
        closeDrawer={closeDrawer}
        detailData={detail.data}
        detailPending={detail.isPending}
        detailError={detail.isError ? detail.error : null}
        onRetryDetail={() => detail.refetch()}
        clubForm={clubForm.data}
        openEdit={openEdit}
        confirmingCancel={confirmingCancel}
        setConfirmingCancel={setConfirmingCancel}
        cancelPending={cancel.isPending}
        cancelError={cancel.isError ? cancel.error : null}
        onConfirmCancel={(id) => cancel.mutate(id)}
        onResetCancel={() => cancel.reset()}
        uploadPending={uploadFile.isPending}
        onUploadFiles={(appId, files) => uploadFile.mutate({ appId, files })}
        deletePending={deleteFile.isPending}
        onDeleteFile={(appId, file) => deleteFile.mutate({ appId, fileId: file.id })}
        editing={editing}
        setEditing={setEditing}
        updatePending={update.isPending}
        updateError={update.isError ? update.error : null}
        onSaveEdit={(app) => update.mutate(app)}
      />
    </ListPage>
  );
}
