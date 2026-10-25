"use client";
import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardList, Eye, ShieldCheck, UserRound, X } from "lucide-react";
import { apiModel, Application, Department, Membership } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useUserNames } from "@/hooks/useUserNames";
import { BreadcrumbToolbar, SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Select, Textarea } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";

const MANAGE_KEYS = ["application.view", "application.review", "application.approve", "application.reject", "member.view", "department.member.add"];

export default function ManagementPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const nameOf = useUserNames(session.can("user.view"));
  const [clubId, setClubId] = useState("");
  const [tab, setTab] = useState<"applications" | "members">("applications");
  const [review, setReview] = useState<{ app: Application; approve: boolean } | null>(null);
  const [note, setNote] = useState("");
  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const clubs = useQuery({ queryKey: ["clubs", "manage"], queryFn: () => apiModel.clubs("", "", 0, 100), enabled: session.ready });
  const scope = session.clubsWith(MANAGE_KEYS);
  const manageable = (clubs.data?.items ?? []).filter((c) => scope.global || scope.ids.has(c.id));
  const currentClub = manageable.find((c) => c.id === clubId) ?? manageable[0];
  const activeClubId = currentClub?.id ?? "";

  const apps = useQuery({ queryKey: ["club-applications", activeClubId], queryFn: () => apiModel.clubApplications(activeClubId), enabled: !!activeClubId });
  const members = useQuery({ queryKey: ["club-members", activeClubId], queryFn: () => apiModel.clubMemberships(activeClubId), enabled: !!activeClubId && tab === "members" });
  const departments = useQuery({ queryKey: ["departments", activeClubId], queryFn: () => apiModel.departments(activeClubId), enabled: !!activeClubId && tab === "members" });
  const activeDepartments = (departments.data?.items ?? []).filter((d) => d.status === "ACTIVE");
  const assignmentQueries = useQueries({ queries: activeDepartments.map((d) => ({ queryKey: ["department-members", d.id], queryFn: () => apiModel.departmentMembers(d.id) })) });
  const assignmentData = assignmentQueries.map((q) => q.data);
  const departmentsByMember = useMemo(() => {
    const result: Record<string, Department[]> = {};
    activeDepartments.forEach((d, i) => (assignmentData[i]?.items ?? []).forEach((a) => { (result[a.membershipId] ??= []).push(d); }));
    return result;
  }, [activeDepartments, assignmentData]);

  const memberDetail = useQuery({ queryKey: ["membership", memberId], queryFn: () => apiModel.membership(memberId!), enabled: !!memberId });

  const refreshMembers = () => {
    queryClient.invalidateQueries({ queryKey: ["club-members", activeClubId] });
    queryClient.invalidateQueries({ queryKey: ["department-members"] });
  };
  const reviewMutation = useMutation({
    mutationFn: ({ app, approve }: { app: Application; approve: boolean }) =>
      approve ? apiModel.approve(activeClubId, app.id, note) : apiModel.reject(activeClubId, app.id, note),
    onSuccess: (_, { approve }) => {
      setNotice(approve ? "Đã duyệt đơn và tạo membership." : "Đã từ chối đơn.");
      setReview(null); setNote(""); setDetailApp(null);
      queryClient.invalidateQueries({ queryKey: ["club-applications", activeClubId] });
      refreshMembers();
    },
  });
  const assign = useMutation({ mutationFn: ({ departmentId, membershipId }: { departmentId: string; membershipId: string }) => apiModel.addDepartmentMember(departmentId, membershipId), onSuccess: refreshMembers });
  const unassign = useMutation({ mutationFn: ({ departmentId, membershipId }: { departmentId: string; membershipId: string }) => apiModel.removeDepartmentMember(departmentId, membershipId), onSuccess: refreshMembers });
  const status = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => apiModel.updateMembership(id, value),
    onSuccess: () => { setNotice("Đã cập nhật trạng thái thành viên."); refreshMembers(); queryClient.invalidateQueries({ queryKey: ["membership", memberId] }); },
  });
  const mutationError = reviewMutation.error || assign.error || unassign.error || status.error;

  const who = (userId: string) => {
    const user = nameOf(userId);
    return <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">{(user?.fullName ?? "?").slice(0, 1)}</span>
      <div className="min-w-0"><p className="max-w-56 truncate font-bold">{user?.fullName ?? "Thành viên"}</p><p className="max-w-56 truncate font-mono text-[10.5px] text-muted-foreground">{user?.email ?? userId.slice(0, 8)}</p></div>
    </div>;
  };

  const openReview = (app: Application, approve: boolean) => { setReview({ app, approve }); setNote(""); reviewMutation.reset(); };
  const pending = apps.data?.items.filter((a) => a.status === "PENDING").length ?? 0;

  return (
    <ListPage title="Quản lý CLB">
      <BreadcrumbToolbar crumbs={[{ label: "Trang chủ", href: "/clubs" }, { label: "Quản lý CLB" }, { label: "Hồ sơ & thành viên" }]}
        titleBadge={<CountBadge>{tab === "applications" ? `${pending} chờ duyệt` : `${members.data?.total ?? 0} thành viên`}</CountBadge>}
        extraActions={<>
          <Select aria-label="Chọn CLB" value={activeClubId} onChange={(e) => { setClubId(e.target.value); setNotice(""); }} className="h-10 w-full text-xs sm:w-48">
            {manageable.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
          </Select>
          <SegmentedTabs value={tab} onChange={setTab} options={[{ value: "applications", label: "Đơn đăng ký" }, { value: "members", label: "Thành viên" }]} />
        </>}
        onRefresh={() => { apps.refetch(); if (tab === "members") refreshMembers(); }} />
      {notice && <Notice tone="success">{notice}</Notice>}
      {mutationError && <Notice tone="error">{describeError(mutationError)}</Notice>}

      {!session.ready || clubs.isPending ? <LoadingRows /> : !manageable.length ? <EmptyState icon={<ShieldCheck />} title="Bạn chưa được giao quản lý CLB nào" />
        : tab === "applications" ? (
          apps.isPending ? <LoadingRows /> : apps.isError ? <ErrorState message={describeError(apps.error)} onRetry={() => apps.refetch()} />
            : !apps.data.items.length ? <EmptyState icon={<ClipboardList />} title="Chưa có đơn đăng ký" />
              : <DataTable ariaLabel="Đơn đăng ký" rows={apps.data.items} rowKey={(a) => a.id} onRowClick={setDetailApp} columns={[
                { key: "date", header: "Ngày gửi", render: (a) => <span className="font-mono font-bold text-primary">{formatDay(a.createdAt)}</span> },
                { key: "applicant", header: "Người nộp", render: (a) => who(a.applicantId) },
                { key: "message", header: "Lời nhắn", className: "max-w-[360px]", render: (a) => <p className="truncate text-muted-foreground">{a.message}</p> },
                { key: "status", header: "Trạng thái", render: (a) => <StatusBadge status={a.status} /> },
                { key: "actions", header: "Thao tác", className: "text-right", render: (a) => <TableRowActions actions={[
                  { icon: <Eye />, label: "Xem chi tiết", onClick: () => setDetailApp(a) },
                  ...(a.status === "PENDING" ? [
                    { icon: <Check />, label: "Duyệt", onClick: () => openReview(a, true) },
                    { icon: <X />, label: "Từ chối", danger: true, onClick: () => openReview(a, false) },
                  ] : []),
                ]} /> },
              ]} />
        ) : (
          members.isPending ? <LoadingRows /> : members.isError ? <ErrorState message={describeError(members.error)} onRetry={() => members.refetch()} />
            : !members.data.items.length ? <EmptyState icon={<UserRound />} title="CLB chưa có thành viên" />
              : <DataTable ariaLabel="Thành viên" rows={members.data.items} rowKey={(m) => m.id} onRowClick={(m) => setMemberId(m.id)} columns={[
                { key: "member", header: "Thành viên", render: (m) => who(m.userId) },
                { key: "joined", header: "Ngày tham gia", render: (m) => <span className="font-mono font-bold text-primary">{formatDay(m.joinedAt)}</span> },
                { key: "departments", header: "Ban", render: (m) => <DepartmentChips departments={departmentsByMember[m.id] ?? []}
                  onRemove={(d) => unassign.mutate({ departmentId: d.id, membershipId: m.id })} /> },
                { key: "assign", header: "Phân ban", render: (m) => (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select aria-label="Phân vào ban" value="" className="h-8 w-44 text-xs" disabled={assign.isPending}
                      onChange={(e) => e.target.value && assign.mutate({ departmentId: e.target.value, membershipId: m.id })}>
                      <option value="">+ Thêm vào ban…</option>
                      {activeDepartments.filter((d) => !(departmentsByMember[m.id] ?? []).some((x) => x.id === d.id)).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Select>
                  </div>) },
                { key: "status", header: "Trạng thái", render: (m) => <StatusBadge status={m.status} /> },
                { key: "actions", header: "Thao tác", className: "text-right", render: (m) => <TableRowActions actions={[{ icon: <Eye />, label: "Xem chi tiết", onClick: () => setMemberId(m.id) }]} /> },
              ]} />
        )}

      <ModalShell open={!!review} onClose={() => setReview(null)} title={review?.approve ? "Duyệt đơn đăng ký" : "Từ chối đơn đăng ký"} icon={review?.approve ? <Check /> : <X />}
        size="sm" onSubmit={() => review && reviewMutation.mutate(review)} submitLabel={review?.approve ? "Duyệt" : "Từ chối"} submitDanger={!review?.approve}
        submitLoading={reviewMutation.isPending} submitDisabled={!note.trim()}>
        {review && <p className="text-sm">{nameOf(review.app.applicantId)?.fullName ?? "Người nộp"} — <span className="text-muted-foreground">{review.app.message}</span></p>}
        <FormField label="Ghi chú xét duyệt" required><Textarea value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} placeholder="Lý do hoặc lời nhắn cho người nộp…" /></FormField>
        {reviewMutation.error && <p className="text-xs text-destructive">{describeError(reviewMutation.error)}</p>}
      </ModalShell>

      <EntityDrawer open={!!detailApp} onClose={() => setDetailApp(null)} title="Chi tiết đơn đăng ký" subtitle={currentClub?.name} icon={<ClipboardList />}
        footer={detailApp?.status === "PENDING" ? <>
          <Button variant="destructive" size="sm" onClick={() => openReview(detailApp, false)}><X size={14} /> Từ chối</Button>
          <Button size="sm" onClick={() => openReview(detailApp, true)}><Check size={14} /> Duyệt</Button>
        </> : undefined}>
        {detailApp && <DetailList rows={[
          ["Người nộp", who(detailApp.applicantId)],
          ["Trạng thái", <StatusBadge key="s" status={detailApp.status} />],
          ["Ngày gửi", formatDateTime(detailApp.createdAt)],
          ["Lời nhắn", <p key="m" className="whitespace-pre-line">{detailApp.message}</p>],
          ["Ngày xét duyệt", formatDateTime(detailApp.reviewedAt)],
          ["Ghi chú", detailApp.reviewNote || "—"],
        ]} />}
      </EntityDrawer>

      <EntityDrawer open={!!memberId} onClose={() => setMemberId(null)} title="Chi tiết thành viên" subtitle={currentClub?.name} icon={<UserRound />}>
        {memberDetail.isPending ? <LoadingRows rows={3} /> : memberDetail.data && <MemberDetail membership={memberDetail.data} who={who}
          departments={departmentsByMember[memberDetail.data.id] ?? []} busy={status.isPending}
          onStatus={(value) => status.mutate({ id: memberDetail.data!.id, value })} />}
      </EntityDrawer>
    </ListPage>
  );
}

function DepartmentChips({ departments, onRemove }: { departments: Department[]; onRemove: (d: Department) => void }) {
  if (!departments.length) return <span className="text-muted-foreground">—</span>;
  return <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>{departments.map((d) => (
    <Badge key={d.id} tone="primary" dot={false} className="pr-1">
      {d.name}
      <button aria-label={`Gỡ khỏi ${d.name}`} onClick={() => onRemove(d)} className="rounded-full p-0.5 hover:bg-primary/15"><X size={10} /></button>
    </Badge>
  ))}</div>;
}

function MemberDetail({ membership, who, departments, busy, onStatus }: {
  membership: Membership; who: (id: string) => React.ReactNode; departments: Department[]; busy: boolean; onStatus: (value: string) => void;
}) {
  return <>
    <DetailList rows={[
      ["Thành viên", who(membership.userId)],
      ["Trạng thái", <StatusBadge key="s" status={membership.status} />],
      ["Ngày tham gia", formatDateTime(membership.joinedAt)],
      ["Ngày rời", formatDateTime(membership.leftAt)],
      ["Ban", departments.length ? departments.map((d) => d.name).join(", ") : "—"],
    ]} />
    <Section title="Đổi trạng thái" icon={<ShieldCheck />}>
      <div className="flex flex-wrap gap-2">
        {membership.status !== "ACTIVE" && <Button size="sm" disabled={busy} onClick={() => onStatus("ACTIVE")}>Kích hoạt lại</Button>}
        {membership.status !== "SUSPENDED" && membership.status !== "LEFT" && <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus("SUSPENDED")}>Tạm đình chỉ</Button>}
        {membership.status !== "LEFT" && <Button size="sm" variant="destructive" disabled={busy} onClick={() => confirm("Xác nhận cho thành viên rời CLB?") && onStatus("LEFT")}>Cho rời CLB</Button>}
      </div>
    </Section>
  </>;
}
