"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck, UserPlus } from "lucide-react";
import { apiModel, Department, Membership } from "@/lib/api";
import { CLUB_WORKSPACE_KEYS, useSession } from "@/hooks/useSession";
import { useUserNames } from "@/hooks/user/useUsers";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { ClubAvatar } from "@/components/shared/ClubMedia";
import { EmptyState, LoadingRows, Notice } from "@/components/shared/States";
import { UserIdentityCell } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge, CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import {
  CLUB_MANAGEMENT_TAB_KEYS,
  ClubManagementTabKey,
  computeVisibleClubTabs,
} from "@/forms/club/club-form";
import { DepartmentsTab } from "@/components/department/DepartmentsTab";
import { EventsTab } from "@/components/event/EventsTab";
import { TasksTab } from "@/components/task/TasksTab";
import { ChatTab } from "@/components/management/ChatTab";
import { ClubSettingsTab } from "@/components/management/ClubSettingsTab";
import { ClubsDirectoryTab } from "@/components/management/ClubsDirectoryTab";
import { ApplicationsTab } from "@/components/application/ClubApplicationsTab";
import { FormsTab } from "@/components/application/FormsTab";
import { OverviewTab } from "@/components/management/OverviewTab";
import { ClubMembersTab } from "@/components/management/ClubMembersTab";
import {
  AddClubMemberModal,
  ClubMemberDetailDrawer,
  ConfirmLeaveClubModal,
  CreateClubModal,
} from "@/components/management/ClubMemberModals";

const MEMBER_LIMIT = 20;

export function ClubManagementView() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <ClubManagementViewContent />
    </Suspense>
  );
}

function ClubManagementViewContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as ClubManagementTabKey | null;
  const urlClubId = searchParams.get("clubId");
  const session = useSession();
  const queryClient = useQueryClient();
  const canViewUsers = session.can("user.view");
  const nameOf = useUserNames(canViewUsers);

  const [clubId, setClubId] = useState("");
  const tab: ClubManagementTabKey =
    urlTab && CLUB_MANAGEMENT_TAB_KEYS.includes(urlTab) ? urlTab : "clubs";

  const [memberStatusFilter, setMemberStatusFilter] = useState("");
  const [memberOffset, setMemberOffset] = useState(0);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState<Membership | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [creatingClub, setCreatingClub] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const clubs = useQuery({
    queryKey: ["clubs", "manage"],
    queryFn: () => apiModel.clubs("", "", 0, 100),
    enabled: session.ready,
  });
  const scope = session.clubsWith(CLUB_WORKSPACE_KEYS);
  const manageable = (clubs.data?.items ?? []).filter((c) => scope.global || scope.ids.has(c.id));
  const requestedClubId = urlClubId || clubId || "";
  const explicitClub = manageable.find((c) => c.id === requestedClubId);
  const clubSupportingTab =
    explicitClub && computeVisibleClubTabs(explicitClub.id, session.canInClub).some((t) => t.value === tab)
      ? explicitClub
      : manageable.find((c) => computeVisibleClubTabs(c.id, session.canInClub).some((t) => t.value === tab));
  const currentClub = clubSupportingTab ?? explicitClub ?? manageable[0];
  const activeClubId = currentClub?.id ?? "";

  const visibleTabs = useMemo(
    () => computeVisibleClubTabs(activeClubId, session.canInClub),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeClubId, session.permissions],
  );

  const activeTab: ClubManagementTabKey = visibleTabs.some((t) => t.value === tab)
    ? tab
    : (visibleTabs[0]?.value ?? "clubs");

  const navigateClubAndTab = (nextClubId: string, nextTab: ClubManagementTabKey) => {
    setClubId(nextClubId);
    setMemberOffset(0);
    setNotice("");
    setErrorMsg("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    if (nextClubId) {
      params.set("clubId", nextClubId);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const canViewApplications = session.canInClub("application.view", activeClubId);
  const canViewMembers = session.canInClub("member.view", activeClubId);
  const canAddMember = session.canInClub("member.add", activeClubId);
  const canUpdateMember = session.canInClub("member.update", activeClubId);
  const canRemoveMember = session.canInClub("member.remove", activeClubId);
  const canViewMemberDetail =
    session.canInClub("member.view_detail", activeClubId) || canUpdateMember || canRemoveMember;
  const canCreateClub = session.can("club.create");

  const pendingApps = useQuery({
    queryKey: ["club-applications", activeClubId, "pending-count"],
    queryFn: () => apiModel.clubApplications(activeClubId, { status: "PENDING", limit: 1 }),
    enabled: !!activeClubId && activeTab === "applications" && canViewApplications,
  });

  const members = useQuery({
    queryKey: ["club-members", activeClubId, memberStatusFilter, memberOffset],
    queryFn: () => apiModel.clubMemberships(activeClubId, memberStatusFilter, memberOffset, MEMBER_LIMIT),
    placeholderData: keepPreviousData,
    enabled: !!activeClubId && activeTab === "members" && canViewMembers,
  });

  const activeMembersForTasks = useQuery({
    queryKey: ["club-members", activeClubId, "ACTIVE-tasks"],
    queryFn: () => apiModel.clubMemberships(activeClubId, "ACTIVE", 0, 100),
    enabled: !!activeClubId && activeTab === "tasks" && canViewMembers,
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
      }),
    );
  }

  const refreshMembers = () => {
    queryClient.invalidateQueries({ queryKey: ["club-members", activeClubId] });
    queryClient.invalidateQueries({ queryKey: ["memberships", activeClubId] });
    queryClient.invalidateQueries({ queryKey: ["department-members"] });
    queryClient.invalidateQueries({ queryKey: ["club-positions", activeClubId] });
  };

  const assign = useMutation({
    mutationFn: ({ departmentId, membershipId }: { departmentId: string; membershipId: string }) =>
      apiModel.addDepartmentMember(departmentId, membershipId),
    onSuccess: () => {
      setNotice("Đã phân thành viên vào ban.");
      setErrorMsg("");
      refreshMembers();
    },
  });
  const unassign = useMutation({
    mutationFn: ({ departmentId, membershipId }: { departmentId: string; membershipId: string }) =>
      apiModel.removeDepartmentMember(departmentId, membershipId),
    onSuccess: () => {
      setNotice("Đã gỡ thành viên khỏi ban.");
      setErrorMsg("");
      refreshMembers();
    },
  });
  const status = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => apiModel.updateMembership(id, value),
    onSuccess: (updated) => {
      setNotice(
        updated.status === "SUSPENDED"
          ? "Đã tạm đình chỉ thành viên (tạm thời ẩn quyền phạm vi CLB & Ban)."
          : "Đã kích hoạt lại tư cách thành viên CLB.",
      );
      setErrorMsg("");
      refreshMembers();
      queryClient.invalidateQueries({ queryKey: ["membership", memberId] });
    },
  });

  const mutationError = assign.error || unassign.error || status.error;

  const who = (userId: string, known?: { name?: string; email?: string; studentCode?: string }) => {
    const user = nameOf(userId);
    const sub =
      [known?.studentCode ?? user?.studentCode, known?.email ?? user?.email].filter(Boolean).join(" · ") ||
      userId.slice(0, 8);
    return <UserIdentityCell name={known?.name ?? user?.fullName} subtitle={sub} />;
  };
  const memberOf = (m: Membership) => who(m.userId, { name: m.userFullName, studentCode: m.userStudentCode });

  const pending = pendingApps.data?.total ?? 0;

  return (
    <ListPage title="Không gian & Quản lý CLB">
      <BreadcrumbToolbar
        crumbs={[
          { label: "Tổng quan", href: "/dashboard" },
          { label: activeTab === "clubs" ? `Toàn bộ câu lạc bộ (${manageable.length})` : (currentClub?.name ?? "Không gian CLB") },
          { label: visibleTabs.find((t) => t.value === activeTab)?.label ?? "Quản lý CLB" },
        ]}
        titleBadge={
          activeTab === "clubs" ? <CountBadge>{manageable.length} CLB</CountBadge>
          : activeTab === "applications" && canViewApplications ? <CountBadge>{pending} chờ duyệt</CountBadge>
          : activeTab === "members" ? <CountBadge>{members.data?.total ?? 0} thành viên</CountBadge>
          : currentClub ? <Badge tone="primary" dot={false}>{currentClub.code}</Badge> : undefined
        }
        extraActions={
          <>
            {currentClub && <ClubAvatar name={currentClub.name} code={currentClub.code} logoUrl={currentClub.logoUrl} size="sm" className="hidden sm:flex" />}
            {manageable.length > 0 && (
              <Select aria-label="Chọn CLB" value={activeClubId} onChange={(e) => navigateClubAndTab(e.target.value, activeTab === "clubs" ? "overview" : activeTab)} className="h-9 w-full text-xs sm:w-64">
                {manageable.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
              </Select>
            )}
            {activeTab === "members" && canAddMember && (
              <Button size="sm" onClick={() => setAddingMember(true)}><UserPlus size={14} /> Thêm thành viên</Button>
            )}
            {canCreateClub && (
              <Button size="sm" variant="outline" onClick={() => setCreatingClub(true)}><Plus size={14} /> Tạo CLB mới</Button>
            )}
          </>
        }
        onRefresh={() => {
          clubs.refetch();
          if (activeTab === "overview") queryClient.invalidateQueries({ queryKey: ["club-statistics", activeClubId] });
          if (activeTab === "applications") queryClient.invalidateQueries({ queryKey: ["club-applications", activeClubId] });
          if (activeTab === "forms") {
            queryClient.invalidateQueries({ queryKey: ["club-application-forms", activeClubId] });
            queryClient.invalidateQueries({ queryKey: ["club-application-form", activeClubId] });
          }
          if (activeTab === "members") refreshMembers();
          if (activeTab === "departments") {
            queryClient.invalidateQueries({ queryKey: ["departments", activeClubId] });
            queryClient.invalidateQueries({ queryKey: ["club-positions", activeClubId] });
            queryClient.invalidateQueries({ queryKey: ["department-members"] });
          }
          if (activeTab === "events") queryClient.invalidateQueries({ queryKey: ["events", activeClubId] });
          if (activeTab === "tasks") queryClient.invalidateQueries({ queryKey: ["tasks", activeClubId] });
          if (activeTab === "chat") {
            queryClient.invalidateQueries({ queryKey: ["chat-channels", activeClubId] });
            queryClient.invalidateQueries({ queryKey: ["chat-messages", activeClubId] });
            queryClient.invalidateQueries({ queryKey: ["chat-summaries", activeClubId] });
          }
        }}
      />
      {visibleTabs.length > 1 && (
        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-1.5 border-b border-border/60 bg-white px-4 py-2.5 sm:px-6">
          {visibleTabs.map((item) => {
            const selected = item.value === activeTab;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => navigateClubAndTab(activeClubId, item.value)}
                className={`inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors ${
                  selected ? "bg-primary text-primary-foreground shadow-2xs" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.value === "clubs" ? `${item.label} (${manageable.length})` : item.label}
              </button>
            );
          })}
        </div>
      )}
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
      ) : activeTab === "clubs" ? (
        <ClubsDirectoryTab clubs={manageable} activeClubId={activeClubId} canCreateClub={canCreateClub} canInClub={session.canInClub} onSelectClubAndTab={(nextClubId, nextTab) => navigateClubAndTab(nextClubId, nextTab)} onOpenCreateClub={() => setCreatingClub(true)} onNotice={setNotice} onError={setErrorMsg} />
      ) : activeTab === "overview" ? (
        <OverviewTab clubId={activeClubId} />
      ) : activeTab === "applications" ? (
        <ApplicationsTab clubId={activeClubId} clubName={currentClub?.name} activeDepartments={activeDepartments} onNotice={setNotice} onError={setErrorMsg} onRefreshMembers={refreshMembers} />
      ) : activeTab === "forms" ? (
        <FormsTab clubId={activeClubId} clubName={currentClub?.name} onNotice={setNotice} onError={setErrorMsg} />
      ) : activeTab === "members" ? (
        <ClubMembersTab
          activeClubId={activeClubId}
          canViewMembers={canViewMembers}
          canAddMember={canAddMember}
          canUpdateMember={canUpdateMember}
          canRemoveMember={canRemoveMember}
          canViewMemberDetail={canViewMemberDetail}
          canInDepartment={session.canInDepartment}
          memberStatusFilter={memberStatusFilter}
          setMemberStatusFilter={setMemberStatusFilter}
          memberOffset={memberOffset}
          setMemberOffset={setMemberOffset}
          memberLimit={MEMBER_LIMIT}
          membersData={members.data}
          membersPending={members.isPending}
          membersError={members.isError ? members.error : null}
          onRetryMembers={() => members.refetch()}
          onOpenAddMember={() => setAddingMember(true)}
          onSelectMember={setMemberId}
          memberOf={memberOf}
          activeDepartments={activeDepartments}
          departmentsByMember={departmentsByMember}
          assignPending={assign.isPending}
          onAssignDepartment={(departmentId, membershipId) => assign.mutate({ departmentId, membershipId })}
          onUnassignDepartment={(departmentId, membershipId) => unassign.mutate({ departmentId, membershipId })}
          statusPending={status.isPending}
          onUpdateStatus={(id, value) => status.mutate({ id, value })}
          onConfirmLeave={setConfirmingLeave}
        />
      ) : activeTab === "departments" ? (
        <DepartmentsTab clubId={activeClubId} onNotice={setNotice} onError={setErrorMsg} />
      ) : activeTab === "events" ? (
        <EventsTab clubId={activeClubId} departments={activeDepartments} onNotice={setNotice} onError={setErrorMsg} />
      ) : activeTab === "tasks" ? (
        <TasksTab clubId={activeClubId} departments={activeDepartments} members={activeMembersForTasks.data?.items ?? []} onNotice={setNotice} onError={setErrorMsg} />
      ) : activeTab === "chat" ? (
        <ChatTab clubId={activeClubId} departments={activeDepartments} onNotice={setNotice} onError={setErrorMsg} />
      ) : currentClub ? (
        <ClubSettingsTab key={currentClub.id} club={currentClub} departments={activeDepartments} onNotice={setNotice} onError={setErrorMsg} />
      ) : null}

      <AddClubMemberModal clubId={activeClubId} open={addingMember} onClose={() => setAddingMember(false)} canViewUsers={canViewUsers} onAdded={() => { setNotice("Đã thêm thành viên trực tiếp vào câu lạc bộ."); setErrorMsg(""); refreshMembers(); }} />
      <CreateClubModal
        open={creatingClub}
        onClose={() => setCreatingClub(false)}
        onCreated={(created) => {
          setNotice(`Đã thành lập câu lạc bộ "${created.name}" (${created.code}) và đồng bộ dữ liệu lên Cloudflare R2 & PostgreSQL.`);
          setErrorMsg("");
          setClubId(created.id);
          queryClient.invalidateQueries({ queryKey: ["clubs"] });
          queryClient.invalidateQueries({ queryKey: ["home", "public-clubs"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard", "public-clubs"] });
        }}
      />
      <ClubMemberDetailDrawer memberId={memberId} clubName={currentClub?.name} onClose={() => setMemberId(null)} memberOf={memberOf} departmentsByMember={departmentsByMember} busy={status.isPending} canUpdate={canUpdateMember} canRemove={canRemoveMember} onStatus={(id, value) => status.mutate({ id, value })} onRequestLeave={setConfirmingLeave} />
      <ConfirmLeaveClubModal confirmingLeave={confirmingLeave} onClose={() => setConfirmingLeave(null)} onRemoved={() => { setNotice("Đã cho thành viên rời CLB (lưu lịch sử trạng thái LEFT và thu hồi quyền tại CLB/Ban)."); setErrorMsg(""); setMemberId(null); refreshMembers(); }} />
    </ListPage>
  );
}
