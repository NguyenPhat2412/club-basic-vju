"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ClipboardList, Eye, Plus, ShieldCheck, Trash2, UserPlus, UserRound, X } from "lucide-react";
import { apiModel, Application, Department, Membership } from "@/lib/api";
import { CLUB_WORKSPACE_KEYS, useSession } from "@/hooks/useSession";
import { useUserNames } from "@/hooks/useUserNames";
import { BreadcrumbToolbar, SegmentedTabs } from "@/components/shared/BreadcrumbToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { DetailList, EntityDrawer, ModalShell, Section } from "@/components/shared/Overlays";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@/components/shared/States";
import { TableRowActions } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { formatDateTime, formatDay } from "@/lib/utils";
import { DepartmentsTab } from "./DepartmentsTab";
import { EventsTab } from "./EventsTab";
import { TasksTab } from "./TasksTab";
import { ChatTab } from "./ChatTab";
import { ClubSettingsTab } from "./ClubSettingsTab";
import { ApplicationsTab } from "./ApplicationsTab";
import { FormsTab } from "./FormsTab";

type TabKey = "applications" | "forms" | "members" | "departments" | "events" | "tasks" | "chat" | "settings";

const EMPTY_NEW_CLUB = { code: "", name: "", activityField: "", contactEmail: "", description: "" };

export default function ManagementPage() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <ManagementPageContent />
    </Suspense>
  );
}

function ManagementPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as TabKey | null;
  const session = useSession();
  const queryClient = useQueryClient();
  const canViewUsers = session.can("user.view");
  const nameOf = useUserNames(canViewUsers);
  const [clubId, setClubId] = useState("");
  const [localTab, setLocalTab] = useState<TabKey>("applications");
  const tab: TabKey = urlTab && ["applications", "forms", "members", "departments", "events", "tasks", "chat", "settings"].includes(urlTab) ? urlTab : localTab;
  const [review, setReview] = useState<{ app: Application; approve: boolean } | null>(null);
  const [note, setNote] = useState("");
  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [creatingClub, setCreatingClub] = useState(false);
  const [clubForm, setClubForm] = useState(EMPTY_NEW_CLUB);
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const clubs = useQuery({ queryKey: ["clubs", "manage"], queryFn: () => apiModel.clubs("", "", 0, 100), enabled: session.ready });
  const scope = session.clubsWith(CLUB_WORKSPACE_KEYS);
  const manageable = (clubs.data?.items ?? []).filter((c) => scope.global || scope.ids.has(c.id));
  const currentClub = manageable.find((c) => c.id === clubId) ?? manageable[0];
  const activeClubId = currentClub?.id ?? "";

  const hasAny = (keys: string[]) => !!activeClubId && keys.some((k) => session.canInClub(k, activeClubId));

  const visibleTabs = useMemo(() => {
    const list: { value: TabKey; label: string }[] = [];
    if (hasAny(["application.view", "application.view_detail", "application.review", "application.approve", "application.reject", "application.update", "application.delete"])) {
      list.push({ value: "applications", label: "Đơn đăng ký" });
    }
    if (hasAny(["application.manage_form", "application.review", "application.approve", "application.view"])) {
      list.push({ value: "forms", label: "Biểu mẫu đơn" });
    }
    if (hasAny(["member.view", "member.view_detail", "member.add", "member.update", "member.remove", "department.member.view", "department.member.add", "department.member.remove"])) {
      list.push({ value: "members", label: "Thành viên" });
    }
    if (hasAny(["department.view", "department.create", "department.update", "department.activate", "department.inactive"])) {
      list.push({ value: "departments", label: "Ban chuyên môn" });
    }
    if (hasAny(["event.view", "event.create", "event.update", "event.attendance"])) {
      list.push({ value: "events", label: "Sự kiện & Điểm danh" });
    }
    if (hasAny(["task.view", "task.create", "task.verify"])) {
      list.push({ value: "tasks", label: "Công việc" });
    }
    if (hasAny(["chat.view", "chat.send", "chat.summarize"])) {
      list.push({ value: "chat", label: "Kênh chat & AI" });
    }
    if (hasAny(["club.update", "club.active", "club.inactive", "notification.send"])) {
      list.push({ value: "settings", label: "Thông tin & Thông báo" });
    }
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClubId, session.permissions]);

  const activeTab: TabKey = visibleTabs.some((t) => t.value === tab) ? tab : (visibleTabs[0]?.value ?? "applications");

  const canApprove = session.canInClub("application.approve", activeClubId);
  const canReject = session.canInClub("application.reject", activeClubId);
  const canAddMember = session.canInClub("member.add", activeClubId);
  const canUpdateMember = session.canInClub("member.update", activeClubId);
  const canRemoveMember = session.canInClub("member.remove", activeClubId);
  const canViewMemberDetail = session.canInClub("member.view_detail", activeClubId) || canUpdateMember || canRemoveMember;
  const canCreateClub = session.can("club.create");

  const apps = useQuery({
    queryKey: ["club-applications", activeClubId],
    queryFn: () => apiModel.clubApplications(activeClubId),
    enabled: !!activeClubId && activeTab === "applications",
  });
  const members = useQuery({
    queryKey: ["club-members", activeClubId],
    queryFn: () => apiModel.clubMemberships(activeClubId, "ACTIVE"),
    enabled: !!activeClubId && (activeTab === "members" || activeTab === "tasks"),
  });
  const departments = useQuery({
    queryKey: ["departments", activeClubId],
    queryFn: () => apiModel.departments(activeClubId),
    enabled: !!activeClubId && session.canInClub("department.view", activeClubId),
  });
  const activeDepartments = (departments.data?.items ?? []).filter((d) => d.status === "ACTIVE");
  const canViewDeptMembers = session.canInClub("department.member.view", activeClubId);
  const assignmentQueries = useQueries({
    queries: activeDepartments.map((d) => ({
      queryKey: ["department-members", d.id],
      queryFn: () => apiModel.departmentMembers(d.id),
      enabled: activeTab === "members" && session.canInDepartment("department.member.view", activeClubId, d.id),
    })),
  });
  const departmentsByMember: Record<string, Department[]> = {};
  if (canViewDeptMembers) {
    activeDepartments.forEach((d, i) =>
      (assignmentQueries[i]?.data?.items ?? []).forEach((a) => {
        (departmentsByMember[a.membershipId] ??= []).push(d);
      })
    );
  }

  const memberDetail = useQuery({ queryKey: ["membership", memberId], queryFn: () => apiModel.membership(memberId!), enabled: !!memberId });
  const candidateUsers = useQuery({
    queryKey: ["users", "candidate", userSearch],
    queryFn: () => apiModel.users(userSearch, 0, 20),
    enabled: addingMember && canViewUsers,
  });

  const refreshMembers = () => {
    queryClient.invalidateQueries({ queryKey: ["club-members", activeClubId] });
    queryClient.invalidateQueries({ queryKey: ["department-members"] });
  };

  const reviewMutation = useMutation({
    mutationFn: ({ app, approve }: { app: Application; approve: boolean }) =>
      approve ? apiModel.approve(activeClubId, app.id, note) : apiModel.reject(activeClubId, app.id, note),
    onSuccess: (_, { approve }) => {
      setNotice(approve ? "Đã duyệt đơn và tạo thành viên CLB." : "Đã từ chối đơn.");
      setErrorMsg("");
      setReview(null); setNote(""); setDetailApp(null);
      queryClient.invalidateQueries({ queryKey: ["club-applications", activeClubId] });
      refreshMembers();
    },
  });

  const addMember = useMutation({
    mutationFn: () => apiModel.addClubMember(activeClubId, newMemberUserId.trim()),
    onSuccess: () => {
      setNotice("Đã thêm thành viên trực tiếp vào câu lạc bộ.");
      setErrorMsg("");
      setAddingMember(false);
      setNewMemberUserId("");
      refreshMembers();
    },
  });

  const createClubMutation = useMutation({
    mutationFn: () =>
      apiModel.createClub({
        code: clubForm.code.trim().toUpperCase(),
        name: clubForm.name.trim(),
        activityField: clubForm.activityField.trim() || undefined,
        contactEmail: clubForm.contactEmail.trim() || undefined,
        description: clubForm.description.trim() || undefined,
      }),
    onSuccess: (created) => {
      setNotice(`Đã thành lập câu lạc bộ "${created.name}" (${created.code}).`);
      setErrorMsg("");
      setCreatingClub(false);
      setClubForm(EMPTY_NEW_CLUB);
      setClubId(created.id);
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
    },
  });

  const assign = useMutation({
    mutationFn: ({ departmentId, membershipId }: { departmentId: string; membershipId: string }) =>
      apiModel.addDepartmentMember(departmentId, membershipId),
    onSuccess: () => { setNotice("Đã phân thành viên vào ban."); refreshMembers(); },
  });
  const unassign = useMutation({
    mutationFn: ({ departmentId, membershipId }: { departmentId: string; membershipId: string }) =>
      apiModel.removeDepartmentMember(departmentId, membershipId),
    onSuccess: () => { setNotice("Đã gỡ thành viên khỏi ban."); refreshMembers(); },
  });
  const status = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => apiModel.updateMembership(id, value),
    onSuccess: () => { setNotice("Đã cập nhật trạng thái thành viên."); refreshMembers(); queryClient.invalidateQueries({ queryKey: ["membership", memberId] }); },
  });
  const removeMember = useMutation({
    mutationFn: (id: string) => apiModel.removeMembership(id),
    onSuccess: () => { setNotice("Đã xoá thành viên khỏi câu lạc bộ."); setMemberId(null); refreshMembers(); },
  });

  const mutationError = reviewMutation.error || assign.error || unassign.error || status.error || removeMember.error || addMember.error;

  const who = (userId: string, known?: { name?: string; email?: string; studentCode?: string }) => {
    const user = nameOf(userId);
    const name = known?.name ?? user?.fullName ?? "Thành viên";
    const sub = [known?.studentCode ?? user?.studentCode, known?.email ?? user?.email].filter(Boolean).join(" · ") || userId.slice(0, 8);
    return (
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">{name.slice(0, 1)}</span>
        <div className="min-w-0"><p className="max-w-56 truncate font-bold">{name}</p><p className="max-w-56 truncate font-mono text-[10.5px] text-muted-foreground">{sub}</p></div>
      </div>
    );
  };
  const applicant = (a: Application) => who(a.applicantId, { name: a.applicantName, email: a.applicantEmail, studentCode: a.applicantStudentCode });
  const memberOf = (m: Membership) => who(m.userId, { name: m.userFullName, studentCode: m.userStudentCode });

  const openReview = (app: Application, approve: boolean) => { setReview({ app, approve }); setNote(""); reviewMutation.reset(); };
  const pending = apps.data?.items.filter((a) => a.status === "PENDING").length ?? 0;

  return (
    <ListPage title="Không gian & Quản lý CLB">
      <BreadcrumbToolbar
        crumbs={[
          { label: "Tổng quan", href: "/dashboard" },
          { label: currentClub?.name ?? "Không gian CLB" },
          { label: visibleTabs.find((t) => t.value === activeTab)?.label ?? "Quản lý" },
        ]}
        titleBadge={
          activeTab === "applications" ? (
            <CountBadge>{pending} chờ duyệt</CountBadge>
          ) : activeTab === "members" ? (
            <CountBadge>{members.data?.total ?? 0} thành viên</CountBadge>
          ) : undefined
        }
        extraActions={
          <>
            {manageable.length > 0 && (
              <Select
                aria-label="Chọn CLB"
                value={activeClubId}
                onChange={(e) => { setClubId(e.target.value); setNotice(""); setErrorMsg(""); }}
                className="h-10 w-full text-xs sm:w-52"
              >
                {manageable.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
              </Select>
            )}
            {visibleTabs.length > 0 && (
              <SegmentedTabs
                value={activeTab}
                onChange={(v) => {
                  setLocalTab(v);
                  router.replace(`/management?tab=${v}`, { scroll: false });
                  setNotice("");
                  setErrorMsg("");
                }}
                options={visibleTabs}
              />
            )}
            {canCreateClub && (
              <Button size="sm" variant="outline" onClick={() => { setCreatingClub(true); createClubMutation.reset(); }}>
                <Plus size={14} /> Tạo CLB mới
              </Button>
            )}
          </>
        }
        onRefresh={() => {
          clubs.refetch();
          if (activeTab === "applications") apps.refetch();
          if (activeTab === "members") refreshMembers();
        }}
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      {(errorMsg || mutationError) && <Notice tone="error">{errorMsg || describeError(mutationError)}</Notice>}

      {!session.ready || clubs.isPending ? (
        <LoadingRows />
      ) : !manageable.length ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="Bạn chưa có quyền quản lý tại CLB nào"
          description="Khi được gán vai trò có tích quyền tại CLB hoặc Ban, các phân hệ tương ứng sẽ tự động hiển thị tại đây."
          actionLabel={canCreateClub ? "Tạo câu lạc bộ mới" : undefined}
          onAction={canCreateClub ? () => setCreatingClub(true) : undefined}
        />
      ) : activeTab === "applications" ? (
        <ApplicationsTab
          clubId={activeClubId}
          clubName={currentClub?.name}
          activeDepartments={activeDepartments}
          onNotice={setNotice}
          onError={setErrorMsg}
          onRefreshMembers={refreshMembers}
        />
      ) : activeTab === "forms" ? (
        <FormsTab
          clubId={activeClubId}
          clubName={currentClub?.name}
          onNotice={setNotice}
          onError={setErrorMsg}
        />
      ) : activeTab === "members" ? (
        <div className="space-y-3">
          {canAddMember && (
            <div className="flex justify-end px-4 pt-2">
              <Button size="sm" onClick={() => { setAddingMember(true); setNewMemberUserId(""); addMember.reset(); }}>
                <UserPlus size={14} /> Thêm thành viên trực tiếp
              </Button>
            </div>
          )}
          {members.isPending ? (
            <LoadingRows />
          ) : members.isError ? (
            <ErrorState message={describeError(members.error)} onRetry={() => members.refetch()} />
          ) : !members.data.items.length ? (
            <EmptyState
              icon={<UserRound />}
              title="CLB chưa có thành viên"
              actionLabel={canAddMember ? "Thêm thành viên" : undefined}
              onAction={canAddMember ? () => setAddingMember(true) : undefined}
            />
          ) : (
            <DataTable
              ariaLabel="Thành viên"
              rows={members.data.items}
              rowKey={(m) => m.id}
              onRowClick={canViewMemberDetail ? (m) => setMemberId(m.id) : undefined}
              columns={[
                { key: "member", header: "Thành viên", render: (m) => memberOf(m) },
                { key: "joined", header: "Ngày tham gia", render: (m) => <span className="font-mono font-bold text-primary">{formatDay(m.joinedAt)}</span> },
                {
                  key: "departments",
                  header: "Ban",
                  render: (m) => (
                    <DepartmentChips
                      departments={departmentsByMember[m.id] ?? []}
                      canRemove={(d) => session.canInDepartment("department.member.remove", activeClubId, d.id)}
                      onRemove={(d) => unassign.mutate({ departmentId: d.id, membershipId: m.id })}
                    />
                  ),
                },
                {
                  key: "assign",
                  header: "Phân ban",
                  render: (m) => {
                    const assignableDepts = activeDepartments.filter(
                      (d) =>
                        session.canInDepartment("department.member.add", activeClubId, d.id) &&
                        !(departmentsByMember[m.id] ?? []).some((x) => x.id === d.id)
                    );
                    if (!assignableDepts.length) return <span className="text-xs text-muted-foreground">—</span>;
                    return (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          aria-label="Phân vào ban"
                          value=""
                          className="h-8 w-44 text-xs"
                          disabled={assign.isPending}
                          onChange={(e) => e.target.value && assign.mutate({ departmentId: e.target.value, membershipId: m.id })}
                        >
                          <option value="">+ Thêm vào ban…</option>
                          {assignableDepts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </Select>
                      </div>
                    );
                  },
                },
                { key: "status", header: "Trạng thái", render: (m) => <StatusBadge status={m.status} /> },
                {
                  key: "actions",
                  header: "Thao tác",
                  className: "text-right",
                  render: (m) =>
                    canViewMemberDetail ? (
                      <TableRowActions actions={[{ icon: <Eye />, label: "Xem chi tiết", onClick: () => setMemberId(m.id) }]} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    ),
                },
              ]}
            />
          )}
        </div>
      ) : activeTab === "departments" ? (
        <DepartmentsTab clubId={activeClubId} onNotice={setNotice} onError={setErrorMsg} />
      ) : activeTab === "events" ? (
        <EventsTab clubId={activeClubId} departments={activeDepartments} onNotice={setNotice} onError={setErrorMsg} />
      ) : activeTab === "tasks" ? (
        <TasksTab clubId={activeClubId} departments={activeDepartments} members={members.data?.items ?? []} onNotice={setNotice} onError={setErrorMsg} />
      ) : activeTab === "chat" ? (
        <ChatTab clubId={activeClubId} departments={activeDepartments} onNotice={setNotice} onError={setErrorMsg} />
      ) : currentClub ? (
        <ClubSettingsTab key={currentClub.id} club={currentClub} departments={activeDepartments} onNotice={setNotice} onError={setErrorMsg} />
      ) : null}

      <ModalShell
        open={!!review}
        onClose={() => setReview(null)}
        title={review?.approve ? "Duyệt đơn đăng ký" : "Từ chối đơn đăng ký"}
        icon={review?.approve ? <Check /> : <X />}
        size="sm"
        onSubmit={() => review && reviewMutation.mutate(review)}
        submitLabel={review?.approve ? "Duyệt" : "Từ chối"}
        submitDanger={!review?.approve}
        submitLoading={reviewMutation.isPending}
        submitDisabled={!note.trim()}
      >
        {review && <p className="text-sm">{review.app.applicantName ?? nameOf(review.app.applicantId)?.fullName ?? "Người nộp"} — <span className="text-muted-foreground">{review.app.message}</span></p>}
        <FormField label="Ghi chú xét duyệt" required><Textarea value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} placeholder="Lý do hoặc lời nhắn cho người nộp…" /></FormField>
        {reviewMutation.error && <p className="text-xs text-destructive">{describeError(reviewMutation.error)}</p>}
      </ModalShell>

      <ModalShell
        open={addingMember}
        onClose={() => setAddingMember(false)}
        title="Thêm thành viên vào câu lạc bộ"
        icon={<UserPlus />}
        size="sm"
        onSubmit={() => addMember.mutate()}
        submitLabel="Thêm thành viên"
        submitLoading={addMember.isPending}
        submitDisabled={!newMemberUserId.trim()}
      >
        {canViewUsers ? (
          <>
            <FormField label="Tìm kiếm tài khoản">
              <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Tìm theo tên, email, mã sinh viên…" />
            </FormField>
            <FormField label="Chọn người dùng" required>
              <Select value={newMemberUserId} onChange={(e) => setNewMemberUserId(e.target.value)}>
                <option value="">Chọn tài khoản…</option>
                {(candidateUsers.data?.items ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email} ({u.studentCode ? `${u.studentCode} · ` : ""}{u.email})
                  </option>
                ))}
              </Select>
            </FormField>
          </>
        ) : (
          <FormField label="Mã định danh người dùng (UUID)" required>
            <Input value={newMemberUserId} onChange={(e) => setNewMemberUserId(e.target.value)} placeholder="Nhập UUID tài khoản cần kết nạp…" />
          </FormField>
        )}
        {addMember.error && <p className="text-xs text-destructive">{describeError(addMember.error)}</p>}
      </ModalShell>

      <ModalShell
        open={creatingClub}
        onClose={() => setCreatingClub(false)}
        title="Thành lập câu lạc bộ mới"
        icon={<Building2 />}
        onSubmit={() => createClubMutation.mutate()}
        submitLabel="Tạo câu lạc bộ"
        submitLoading={createClubMutation.isPending}
        submitDisabled={!clubForm.code.trim() || !clubForm.name.trim()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Mã câu lạc bộ" required hint="In hoa, chữ số hoặc dấu gạch ngang (VD: VJU-IT)">
            <Input value={clubForm.code} maxLength={50} onChange={(e) => setClubForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="VJU-IT" />
          </FormField>
          <FormField label="Tên câu lạc bộ" required>
            <Input value={clubForm.name} maxLength={200} onChange={(e) => setClubForm((f) => ({ ...f, name: e.target.value }))} placeholder="CLB Công nghệ thông tin" />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Lĩnh vực hoạt động">
            <Input value={clubForm.activityField} maxLength={200} onChange={(e) => setClubForm((f) => ({ ...f, activityField: e.target.value }))} placeholder="Học thuật, Văn hóa, Thể thao…" />
          </FormField>
          <FormField label="Email liên hệ">
            <Input type="email" value={clubForm.contactEmail} maxLength={320} onChange={(e) => setClubForm((f) => ({ ...f, contactEmail: e.target.value }))} placeholder="clb@vju.ac.vn" />
          </FormField>
        </div>
        <FormField label="Giới thiệu câu lạc bộ">
          <Textarea value={clubForm.description} maxLength={2000} onChange={(e) => setClubForm((f) => ({ ...f, description: e.target.value }))} />
        </FormField>
        {createClubMutation.error && <p className="text-xs text-destructive">{describeError(createClubMutation.error)}</p>}
      </ModalShell>

      <EntityDrawer
        open={!!detailApp}
        onClose={() => setDetailApp(null)}
        title="Chi tiết đơn đăng ký"
        subtitle={currentClub?.name}
        icon={<ClipboardList />}
        footer={
          detailApp?.status === "PENDING" && (canApprove || canReject) ? (
            <>
              {canReject && <Button variant="destructive" size="sm" onClick={() => openReview(detailApp, false)}><X size={14} /> Từ chối</Button>}
              {canApprove && <Button size="sm" onClick={() => openReview(detailApp, true)}><Check size={14} /> Duyệt</Button>}
            </>
          ) : undefined
        }
      >
        {detailApp && (
          <DetailList
            rows={[
              ["Người nộp", applicant(detailApp)],
              ["Trạng thái", <StatusBadge key="s" status={detailApp.status} />],
              ["Ngày gửi", formatDateTime(detailApp.createdAt)],
              ["Lời nhắn", <p key="m" className="whitespace-pre-line">{detailApp.message}</p>],
              ["Ngày xét duyệt", formatDateTime(detailApp.reviewedAt)],
              ["Ghi chú", detailApp.reviewNote || "—"],
            ]}
          />
        )}
      </EntityDrawer>

      <EntityDrawer open={!!memberId} onClose={() => setMemberId(null)} title="Chi tiết thành viên" subtitle={currentClub?.name} icon={<UserRound />}>
        {memberDetail.isPending ? (
          <LoadingRows rows={3} />
        ) : (
          memberDetail.data && (
            <MemberDetail
              membership={memberDetail.data}
              memberOf={memberOf}
              departments={departmentsByMember[memberDetail.data.id] ?? []}
              busy={status.isPending || removeMember.isPending}
              canUpdate={canUpdateMember}
              canRemove={canRemoveMember}
              onStatus={(value) => status.mutate({ id: memberDetail.data!.id, value })}
              onRemove={() => confirm("Xác nhận xoá hồ sơ thành viên này khỏi CLB?") && removeMember.mutate(memberDetail.data!.id)}
            />
          )
        )}
      </EntityDrawer>
    </ListPage>
  );
}

function DepartmentChips({
  departments,
  canRemove,
  onRemove,
}: {
  departments: Department[];
  canRemove: (d: Department) => boolean;
  onRemove: (d: Department) => void;
}) {
  if (!departments.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
      {departments.map((d) => (
        <Badge key={d.id} tone="primary" dot={false} className={canRemove(d) ? "pr-1" : undefined}>
          {d.name}
          {canRemove(d) && (
            <button aria-label={`Gỡ khỏi ${d.name}`} onClick={() => onRemove(d)} className="rounded-full p-0.5 hover:bg-primary/15">
              <X size={10} />
            </button>
          )}
        </Badge>
      ))}
    </div>
  );
}

function MemberDetail({
  membership,
  memberOf,
  departments,
  busy,
  canUpdate,
  canRemove,
  onStatus,
  onRemove,
}: {
  membership: Membership;
  memberOf: (m: Membership) => React.ReactNode;
  departments: Department[];
  busy: boolean;
  canUpdate: boolean;
  canRemove: boolean;
  onStatus: (value: string) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <DetailList
        rows={[
          ["Thành viên", memberOf(membership)],
          ["Trạng thái", <StatusBadge key="s" status={membership.status} />],
          ["Ngày tham gia", formatDateTime(membership.joinedAt)],
          ["Ngày rời", formatDateTime(membership.leftAt)],
          ["Ban", departments.length ? departments.map((d) => d.name).join(", ") : "—"],
        ]}
      />
      {(canUpdate || canRemove) && (
        <Section title="Quản lý trạng thái thành viên" icon={<ShieldCheck />}>
          <div className="flex flex-wrap gap-2">
            {canUpdate && membership.status !== "ACTIVE" && (
              <Button size="sm" disabled={busy} onClick={() => onStatus("ACTIVE")}>Kích hoạt lại</Button>
            )}
            {canUpdate && membership.status !== "SUSPENDED" && membership.status !== "LEFT" && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus("SUSPENDED")}>Tạm đình chỉ</Button>
            )}
            {canUpdate && membership.status !== "LEFT" && (
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => confirm("Xác nhận cho thành viên rời CLB?") && onStatus("LEFT")}>
                Cho rời CLB
              </Button>
            )}
            {canRemove && (
              <Button size="sm" variant="destructive" disabled={busy} onClick={onRemove}>
                <Trash2 size={14} /> Xoá khỏi CLB
              </Button>
            )}
          </div>
        </Section>
      )}
    </>
  );
}
