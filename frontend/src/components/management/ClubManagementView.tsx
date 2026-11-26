"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { ShieldCheck } from "lucide-react";
import { apiModel, Department, Membership } from "@/lib/api";
import { CLUB_WORKSPACE_KEYS, useSession } from "@/hooks/useSession";
import { useActiveUnit } from "@/hooks/useActiveUnit";
import { useUserNames } from "@/hooks/user/useUsers";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { EmptyState, LoadingRows, Notice } from "@/components/shared/States";
import { UserIdentityCell } from "@/components/shared/TableRowActions";
import { describeError, ListPage } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import {
  CLUB_MANAGEMENT_TAB_KEYS,
  ClubManagementTabKey,
  computeVisibleClubTabs,
} from "@/forms/club/club-form";
import { DepartmentsTab } from "@/components/department/DepartmentsTab";
import { DocumentsView } from "@/components/document/DocumentsView";
import { EventsTab } from "@/components/event/EventsTab";
import { TasksTab } from "@/components/task/TasksTab";
import { ChatTab } from "@/components/management/ChatTab";
import { ClubSettingsTab } from "@/components/management/ClubSettingsTab";
import { ClubsDirectoryTab } from "@/components/management/ClubsDirectoryTab";
import { ApplicationsTab } from "@/components/application/ClubApplicationsTab";
import { FormsTab } from "@/components/application/FormsTab";
import { OverviewTab } from "@/components/management/OverviewTab";
import { ClubCertificatesOverviewSection } from "@/components/management/ClubCertificatesOverviewSection";
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
  const unitCtx = useActiveUnit();
  const queryClient = useQueryClient();
  const canViewUsers = session.can("user.view");
  const nameOf = useUserNames(canViewUsers);

  const [clubId, setClubId] = useState("");
  const tab: ClubManagementTabKey =
    urlTab && CLUB_MANAGEMENT_TAB_KEYS.includes(urlTab) ? urlTab : "clubs";

  const [memberStatusFilter, setMemberStatusFilter] = useState("");
  const [memberDeptFilter, setMemberDeptFilter] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberOffset, setMemberOffset] = useState(0);
  const [memberLimit, setMemberLimit] = useState(MEMBER_LIMIT);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState<Membership | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [creatingClub, setCreatingClub] = useState(false);
  const [noticeState, setNoticeState] = useState<{ seq: number; text: string }>({ seq: 0, text: "" });
  const [errorState, setErrorState] = useState<{ seq: number; text: string }>({ seq: 0, text: "" });
  const notice = noticeState.text;
  const errorMsg = errorState.text;
  const setNotice = (text: string) => setNoticeState((prev) => ({ seq: prev.seq + 1, text }));
  const setErrorMsg = (text: string) => setErrorState((prev) => ({ seq: prev.seq + 1, text }));

  const clubs = useQuery({
    queryKey: qk.clubs("manage"),
    queryFn: () => apiModel.clubs("", "", 0, 100),
    enabled: session.ready,
  });
  const scope = session.clubsWith(CLUB_WORKSPACE_KEYS);
  const manageable = useMemo(
    () => (clubs.data?.items ?? []).filter((c) => scope.global || scope.ids.has(c.id)),
    [clubs.data?.items, scope.global, scope.ids],
  );
  const requestedClubId = urlClubId || unitCtx.activeClubId || clubId || "";
  const explicitClub = manageable.find((c) => c.id === requestedClubId);
  const currentClub =
    explicitClub ??
    (!requestedClubId
      ? manageable.find((c) => computeVisibleClubTabs(c.id, session.canInClub).some((t) => t.value === tab))
      : undefined) ??
    manageable[0];
  const activeClubId = currentClub?.id ?? "";

  const visibleTabs = useMemo(
    () => computeVisibleClubTabs(activeClubId, session.canInClub),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeClubId, session.permissions],
  );

  const activeTab: ClubManagementTabKey = visibleTabs.some((t) => t.value === tab)
    ? tab
    : (visibleTabs[0]?.value ?? "clubs");

  useEffect(() => {
    if (!session.ready || clubs.isPending || !activeClubId || urlTab === null || (activeTab === tab && urlTab === activeTab)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", activeTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeClubId, activeTab, clubs.isPending, pathname, router, searchParams, session.ready, tab, urlTab]);

  const navigateClubAndTab = (nextClubId: string, nextTab: ClubManagementTabKey, section?: string) => {
    setClubId(nextClubId);
    if (nextClubId) unitCtx.setActiveUnitId(nextClubId);
    setMemberOffset(0);
    setMemberDeptFilter("");
    setMemberSearch("");
    setNotice("");
    setErrorMsg("");
    const targetVisible = nextClubId ? computeVisibleClubTabs(nextClubId, session.canInClub) : null;
    const resolvedTab = !targetVisible || targetVisible.some((t) => t.value === nextTab)
      ? nextTab : (targetVisible[0]?.value ?? "clubs");
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", resolvedTab);
    params.delete("fbSelect");
    params.delete("fbError");
    if (section) params.set("section", section);
    else params.delete("section");
    if (nextClubId) params.set("clubId", nextClubId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const canViewMembers = session.canInClub("member.view", activeClubId);
  const canAddMember = session.canInClub("member.add", activeClubId);
  const canUpdateMember = session.canInClub("member.update", activeClubId);
  const canRemoveMember = session.canInClub("member.remove", activeClubId);
  const canViewMemberDetail =
    session.canInClub("member.view_detail", activeClubId) || canUpdateMember || canRemoveMember;
  const canCreateClub = session.can("club.create");

  const members = useQuery({
    queryKey: qk.clubMembers(activeClubId, memberStatusFilter, memberDeptFilter, memberSearch, memberOffset, memberLimit),
    queryFn: () =>
      apiModel.clubMemberships(activeClubId, memberStatusFilter, memberOffset, memberLimit, {
        departmentId: memberDeptFilter || undefined,
        search: memberSearch.trim() || undefined,
      }),
    placeholderData: keepPreviousData,
    enabled: !!activeClubId && activeTab === "members" && canViewMembers,
  });

  const activeMembersForTasks = useQuery({
    queryKey: qk.clubMembers(activeClubId, "ACTIVE-tasks"),
    queryFn: () => apiModel.clubMemberships(activeClubId, "ACTIVE", 0, 100),
    enabled: !!activeClubId && activeTab === "tasks" && canViewMembers,
  });

  const departments = useQuery({
    queryKey: qk.departments(activeClubId),
    queryFn: () => apiModel.departments(activeClubId),
    enabled: !!activeClubId && session.canInClub("department.view", activeClubId),
  });
  const activeDepartments = (departments.data?.items ?? []).filter((d) => d.status === "ACTIVE");
  const canViewDeptMembers = session.canInClub("department.member.view", activeClubId);
  const assignmentQueries = useQueries({
    queries: activeDepartments.map((d) => ({
      queryKey: qk.departmentMembers(d.id),
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
    queryClient.invalidateQueries({ queryKey: qk.clubMembers(activeClubId) });
    queryClient.invalidateQueries({ queryKey: qk.departmentMembers() });
    queryClient.invalidateQueries({ queryKey: qk.clubPositions(activeClubId) });
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
      queryClient.invalidateQueries({ queryKey: qk.membership(memberId) });
    },
  });

  const mutationError = assign.error || unassign.error || status.error;

  const who = (userId: string, known?: { name?: string; email?: string; studentCode?: string; avatarUrl?: string }) => {
    const user = nameOf(userId);
    const sub =
      [known?.studentCode ?? user?.studentCode, known?.email ?? user?.email].filter(Boolean).join(" · ") ||
      userId.slice(0, 8);
    return <UserIdentityCell name={known?.name ?? user?.fullName} subtitle={sub} avatarUrl={known?.avatarUrl ?? user?.avatarUrl} />;
  };
  const memberOf = (m: Membership) => who(m.userId, { name: m.userFullName, studentCode: m.userStudentCode, avatarUrl: m.userAvatarUrl });

  const tabHasOwnToolbar =
    activeTab === "clubs" ||
    activeTab === "overview" ||
    activeTab === "members" ||
    activeTab === "departments" ||
    activeTab === "applications" ||
    activeTab === "forms" ||
    activeTab === "events" ||
    activeTab === "certificates" ||
    activeTab === "tasks" ||
    activeTab === "documents" ||
    activeTab === "settings";

  return (
    <ListPage title="Không gian & Quản lý CLB" fillViewport={activeTab === "chat"}>
      {!tabHasOwnToolbar && (
        <BreadcrumbToolbar
          compact={activeTab === "chat"}
          crumbs={[
            { label: "Tổng quan", href: "/dashboard" },
            { label: currentClub?.name ?? "Không gian CLB" },
            { label: visibleTabs.find((t) => t.value === activeTab)?.label ?? "Quản lý CLB" },
          ]}
          titleBadge={currentClub ? <Badge tone="primary" dot={false}>{currentClub.code}</Badge> : undefined}
        />
      )}
      {notice && <Notice key={`ok-${noticeState.seq}`} tone="success">{notice}</Notice>}
      {(errorMsg || mutationError) && <Notice key={`err-${errorState.seq}`} tone="error">{errorMsg || describeError(mutationError)}</Notice>}

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
        <OverviewTab
          clubId={activeClubId}
          club={currentClub}
          canCustomize={session.canInClub("club.update", activeClubId)}
          canManageFacebook={session.canInClub("club.facebook.manage", activeClubId) || session.canInClub("club.update", activeClubId)}
          onOpenCustomize={() => navigateClubAndTab(activeClubId, "settings", "appearance")}
          onOpenFacebookSettings={() => navigateClubAndTab(activeClubId, "settings", "facebook")}
        />
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
          memberDeptFilter={memberDeptFilter}
          setMemberDeptFilter={setMemberDeptFilter}
          memberSearch={memberSearch}
          setMemberSearch={setMemberSearch}
          memberOffset={memberOffset}
          setMemberOffset={setMemberOffset}
          memberLimit={memberLimit}
          setMemberLimit={setMemberLimit}
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
      ) : activeTab === "certificates" ? (
        <ClubCertificatesOverviewSection
          key={`${activeClubId}:${searchParams.get("search") ?? ""}`}
          clubId={activeClubId}
          clubCode={currentClub?.code}
          mode="page"
          initialSearch={searchParams.get("search") ?? ""}
          canViewAllUnits={session.hasGlobal("event.view") || session.hasGlobal("club.view") || session.hasGlobal("system.view")}
        />
      ) : activeTab === "tasks" ? (
        <TasksTab clubId={activeClubId} departments={activeDepartments} members={activeMembersForTasks.data?.items ?? []} onNotice={setNotice} onError={setErrorMsg} />
      ) : activeTab === "documents" ? (
        <DocumentsView key={activeClubId} embeddedClubId={activeClubId} />
      ) : activeTab === "chat" ? (
        <ChatTab key={activeClubId} clubId={activeClubId} departments={activeDepartments} onNotice={setNotice} onError={setErrorMsg} />
      ) : currentClub ? (
        <ClubSettingsTab key={currentClub.id} club={currentClub} departments={activeDepartments} onNotice={setNotice} onError={setErrorMsg} />
      ) : null}

      <AddClubMemberModal clubId={activeClubId} open={addingMember} onClose={() => setAddingMember(false)} canViewUsers={canViewUsers} onAdded={() => { setNotice("Đã thêm thành viên trực tiếp vào câu lạc bộ."); setErrorMsg(""); refreshMembers(); }} />
      <CreateClubModal
        open={creatingClub}
        onClose={() => setCreatingClub(false)}
        onCreated={(created) => {
          setNotice(`Đã thành lập câu lạc bộ "${created.name}" (${created.code}).`);
          setErrorMsg("");
          setClubId(created.id);
          unitCtx.setActiveUnitId(created.id);
          queryClient.invalidateQueries({ queryKey: qk.clubs() });
          queryClient.invalidateQueries({ queryKey: qk.home("public-clubs") });
          queryClient.invalidateQueries({ queryKey: qk.dashboard("public-clubs") });
        }}
      />
      <ClubMemberDetailDrawer memberId={memberId} clubId={activeClubId} clubName={currentClub?.name} onClose={() => setMemberId(null)} memberOf={memberOf} departmentsByMember={departmentsByMember} activeDepartments={activeDepartments} busy={status.isPending} canUpdate={canUpdateMember} canRemove={canRemoveMember} onStatus={(id, value) => status.mutate({ id, value })} onRequestLeave={setConfirmingLeave} />
      <ConfirmLeaveClubModal confirmingLeave={confirmingLeave} onClose={() => setConfirmingLeave(null)} onRemoved={() => { setNotice("Đã cho thành viên rời CLB (lưu lịch sử trạng thái LEFT và thu hồi quyền tại CLB/Ban)."); setErrorMsg(""); setMemberId(null); refreshMembers(); }} />
    </ListPage>
  );
}
