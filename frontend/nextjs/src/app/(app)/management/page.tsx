"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Eye, FilterX, PauseCircle, PlayCircle, Plus, ShieldCheck, UserMinus, UserPlus, UserRound, X } from "lucide-react";
import { apiModel, Department, Membership } from "@/lib/api";
import { CLUB_WORKSPACE_KEYS, useSession } from "@/hooks/useSession";
import { useUserNames } from "@/hooks/useUserNames";
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
import { DepartmentsTab } from "./DepartmentsTab";
import { EventsTab } from "./EventsTab";
import { TasksTab } from "./TasksTab";
import { ChatTab } from "./ChatTab";
import { ClubSettingsTab } from "./ClubSettingsTab";
import { ApplicationsTab } from "./ApplicationsTab";
import { FormsTab } from "./FormsTab";

type TabKey = "applications" | "forms" | "members" | "departments" | "events" | "tasks" | "chat" | "settings";

const MEMBER_LIMIT = 20;
const EMPTY_NEW_CLUB = { code: "", name: "", activityField: "", contactEmail: "", description: "" };

export default function ManagementPage() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <ManagementPageContent />
    </Suspense>
  );
}

function ManagementPageContent() {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as TabKey | null;
  const session = useSession();
  const queryClient = useQueryClient();
  const canViewUsers = session.can("user.view");
  const nameOf = useUserNames(canViewUsers);

  const [clubId, setClubId] = useState("");
  const tab: TabKey = urlTab && ["applications", "forms", "members", "departments", "events", "tasks", "chat", "settings"].includes(urlTab) ? urlTab : "applications";

  const [memberStatusFilter, setMemberStatusFilter] = useState("");
  const [memberOffset, setMemberOffset] = useState(0);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState<Membership | null>(null);
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
    if (hasAny(["application.create", "application.view", "application.view_detail", "application.review", "application.approve", "application.reject", "application.update"])) {
      list.push({ value: "applications", label: "Đơn đăng ký" });
    }
    if (hasAny(["application.manage_form", "application.review", "application.approve", "application.view"])) {
      list.push({ value: "forms", label: "Biểu mẫu đơn" });
    }
    if (hasAny(["member.view", "member.view_detail", "member.add", "member.update", "member.remove"])) {
      list.push({ value: "members", label: "Thành viên" });
    }
    if (hasAny(["department.view", "department.create", "department.update", "department.activate", "department.inactive", "department.member.view", "department.member.add", "department.member.remove"])) {
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

  const canViewApplications = session.canInClub("application.view", activeClubId);
  const canViewMembers = session.canInClub("member.view", activeClubId);
  const canAddMember = session.canInClub("member.add", activeClubId);
  const canUpdateMember = session.canInClub("member.update", activeClubId);
  const canRemoveMember = session.canInClub("member.remove", activeClubId);
  const canViewMemberDetail = session.canInClub("member.view_detail", activeClubId) || canUpdateMember || canRemoveMember;
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
    queryClient.invalidateQueries({ queryKey: ["memberships", activeClubId] });
    queryClient.invalidateQueries({ queryKey: ["department-members"] });
    queryClient.invalidateQueries({ queryKey: ["club-positions", activeClubId] });
  };

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
    onSuccess: () => { setNotice("Đã phân thành viên vào ban."); setErrorMsg(""); refreshMembers(); },
  });
  const unassign = useMutation({
    mutationFn: ({ departmentId, membershipId }: { departmentId: string; membershipId: string }) =>
      apiModel.removeDepartmentMember(departmentId, membershipId),
    onSuccess: () => { setNotice("Đã gỡ thành viên khỏi ban."); setErrorMsg(""); refreshMembers(); },
  });
  const status = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => apiModel.updateMembership(id, value),
    onSuccess: (updated) => {
      setNotice(
        updated.status === "SUSPENDED"
          ? "Đã tạm đình chỉ thành viên (tạm thời ẩn quyền phạm vi CLB & Ban)."
          : "Đã kích hoạt lại tư cách thành viên CLB."
      );
      setErrorMsg("");
      refreshMembers();
      queryClient.invalidateQueries({ queryKey: ["membership", memberId] });
    },
  });
  const removeMember = useMutation({
    mutationFn: (id: string) => apiModel.removeMembership(id),
    onSuccess: () => {
      setNotice("Đã cho thành viên rời CLB (lưu lịch sử trạng thái LEFT và thu hồi quyền tại CLB/Ban).");
      setErrorMsg("");
      setConfirmingLeave(null);
      setMemberId(null);
      refreshMembers();
    },
  });

  const mutationError = assign.error || unassign.error || status.error || removeMember.error || addMember.error;

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
  const memberOf = (m: Membership) => who(m.userId, { name: m.userFullName, studentCode: m.userStudentCode });

  const pending = pendingApps.data?.total ?? 0;

  return (
    <ListPage title="Không gian & Quản lý CLB">
      <BreadcrumbToolbar
        crumbs={[
          { label: "Tổng quan", href: "/dashboard" },
          { label: currentClub?.name ?? "Không gian CLB" },
          { label: visibleTabs.find((t) => t.value === activeTab)?.label ?? "Quản lý CLB" },
        ]}
        titleBadge={
          activeTab === "applications" && canViewApplications ? (
            <CountBadge>{pending} chờ duyệt</CountBadge>
          ) : activeTab === "members" ? (
            <CountBadge>{members.data?.total ?? 0} thành viên</CountBadge>
          ) : currentClub ? (
            <Badge tone="primary" dot={false}>{currentClub.code}</Badge>
          ) : undefined
        }
        extraActions={
          <>
            {manageable.length > 0 && (
              <Select
                aria-label="Chọn CLB"
                value={activeClubId}
                onChange={(e) => {
                  setClubId(e.target.value);
                  setMemberOffset(0);
                  setNotice("");
                  setErrorMsg("");
                }}
                className="h-9 w-full text-xs sm:w-64"
              >
                {manageable.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
              </Select>
            )}
            {activeTab === "members" && canAddMember && (
              <Button size="sm" onClick={() => { setAddingMember(true); setNewMemberUserId(""); addMember.reset(); }}>
                <UserPlus size={14} /> Thêm thành viên
              </Button>
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
          if (activeTab === "applications") {
            queryClient.invalidateQueries({ queryKey: ["club-applications", activeClubId] });
          }
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
        <div className="flex flex-1 flex-col space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 sm:px-6">
            <p className="text-xs text-muted-foreground">
              Quản lý vòng đời thành viên (Đang hoạt động · Tạm đình chỉ · Đã rời CLB) và phân công vào các ban chuyên môn.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Lọc trạng thái thành viên"
                value={memberStatusFilter}
                onChange={(e) => {
                  setMemberStatusFilter(e.target.value);
                  setMemberOffset(0);
                }}
                className="h-9 w-52 text-xs"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">ACTIVE — Đang hoạt động</option>
                <option value="SUSPENDED">SUSPENDED — Tạm đình chỉ</option>
                <option value="LEFT">LEFT — Đã rời CLB</option>
              </Select>
              {memberStatusFilter !== "" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMemberStatusFilter("");
                    setMemberOffset(0);
                  }}
                >
                  <FilterX size={14} /> Xoá bộ lọc
                </Button>
              )}
            </div>
          </div>

          {!canViewMembers ? (
            <EmptyState
              icon={<ShieldCheck />}
              title="Bạn chưa có quyền xem danh sách thành viên CLB"
              description="Nếu bạn phụ trách Ban chuyên môn, vui lòng chuyển sang tab Ban chuyên môn để quản lý thành viên trong ban."
            />
          ) : members.isPending ? (
            <LoadingRows />
          ) : members.isError ? (
            <ErrorState message={describeError(members.error)} onRetry={() => members.refetch()} />
          ) : !members.data.items.length ? (
            <EmptyState
              icon={<UserRound />}
              title={memberStatusFilter ? "Không có thành viên khớp bộ lọc" : "CLB chưa có thành viên"}
              actionLabel={
                memberStatusFilter
                  ? "Xoá bộ lọc"
                  : canAddMember
                  ? "Thêm thành viên"
                  : undefined
              }
              onAction={
                memberStatusFilter
                  ? () => {
                      setMemberStatusFilter("");
                      setMemberOffset(0);
                    }
                  : canAddMember
                  ? () => setAddingMember(true)
                  : undefined
              }
            />
          ) : (
            <>
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
                        canRemove={(d) => m.status !== "LEFT" && session.canInDepartment("department.member.remove", activeClubId, d.id)}
                        onRemove={(d) => unassign.mutate({ departmentId: d.id, membershipId: m.id })}
                      />
                    ),
                  },
                  {
                    key: "assign",
                    header: "Phân ban",
                    render: (m) => {
                      if (m.status !== "ACTIVE") {
                        return <span className="text-xs text-muted-foreground">—</span>;
                      }
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
                    render: (m) => {
                      const actions = [
                        ...(canViewMemberDetail
                          ? [{ icon: <Eye />, label: "Xem chi tiết", onClick: () => setMemberId(m.id) }]
                          : []),
                        ...(canUpdateMember && m.status === "ACTIVE"
                          ? [
                              {
                                icon: <PauseCircle />,
                                label: "Tạm đình chỉ",
                                onClick: () => status.mutate({ id: m.id, value: "SUSPENDED" }),
                                disabled: status.isPending,
                              },
                            ]
                          : []),
                        ...(canUpdateMember && m.status === "SUSPENDED"
                          ? [
                              {
                                icon: <PlayCircle />,
                                label: "Kích hoạt lại",
                                onClick: () => status.mutate({ id: m.id, value: "ACTIVE" }),
                                disabled: status.isPending,
                              },
                            ]
                          : []),
                        ...(canRemoveMember && m.status !== "LEFT"
                          ? [
                              {
                                icon: <UserMinus />,
                                label: "Cho rời CLB",
                                danger: true,
                                onClick: () => {
                                  removeMember.reset();
                                  setConfirmingLeave(m);
                                },
                                disabled: removeMember.isPending,
                              },
                            ]
                          : []),
                      ];
                      return actions.length ? (
                        <TableRowActions actions={actions} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      );
                    },
                  },
                ]}
              />
              <Pagination offset={memberOffset} limit={MEMBER_LIMIT} total={members.data.total} onOffset={setMemberOffset} />
            </>
          )}
        </div>
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

      <EntityDrawer open={!!memberId} onClose={() => setMemberId(null)} title="Chi tiết thành viên" subtitle={currentClub?.name} icon={<UserRound />}>
        {memberDetail.isPending ? (
          <LoadingRows rows={3} />
        ) : memberDetail.isError ? (
          <ErrorState message={describeError(memberDetail.error)} onRetry={() => memberDetail.refetch()} />
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
              onLeave={() => {
                removeMember.reset();
                setConfirmingLeave(memberDetail.data!);
              }}
            />
          )
        )}
      </EntityDrawer>

      <ModalShell
        open={!!confirmingLeave}
        onClose={() => setConfirmingLeave(null)}
        title="Xác nhận cho thành viên rời CLB"
        icon={<UserMinus />}
        size="sm"
        onSubmit={() => confirmingLeave && removeMember.mutate(confirmingLeave.id)}
        submitLabel="Xác nhận rời CLB"
        submitDanger
        submitLoading={removeMember.isPending}
      >
        {confirmingLeave && (
          <div className="space-y-2 text-sm">
            <p>
              Xác nhận chuyển thành viên <b>{confirmingLeave.userFullName || confirmingLeave.userId}</b> sang trạng thái <b>Đã rời CLB (LEFT)</b>?
            </p>
            <p className="text-xs text-muted-foreground">
              Hệ thống sẽ lưu lại lịch sử tham gia (không xoá cứng dữ liệu), đồng thời tự động gỡ tư cách thành viên các Ban chuyên môn và thu hồi mọi vai trò/quyền thuộc phạm vi CLB này.
            </p>
            {removeMember.error && <p className="text-xs text-destructive">{describeError(removeMember.error)}</p>}
          </div>
        )}
      </ModalShell>
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
            <button type="button" aria-label={`Gỡ khỏi ${d.name}`} onClick={() => onRemove(d)} className="rounded-full p-0.5 hover:bg-primary/15">
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
  onLeave,
}: {
  membership: Membership;
  memberOf: (m: Membership) => React.ReactNode;
  departments: Department[];
  busy: boolean;
  canUpdate: boolean;
  canRemove: boolean;
  onStatus: (value: string) => void;
  onLeave: () => void;
}) {
  return (
    <>
      <DetailList
        rows={[
          ["Thành viên", memberOf(membership)],
          ["Trạng thái", <StatusBadge key="s" status={membership.status} />],
          ["Ngày tham gia", formatDateTime(membership.joinedAt)],
          ["Ngày rời CLB", formatDateTime(membership.leftAt)],
          ["Ban chuyên môn", departments.length ? departments.map((d) => d.name).join(", ") : "—"],
        ]}
      />
      {((canUpdate && membership.status !== "LEFT") || (canRemove && membership.status !== "LEFT")) && (
        <Section title="Quản lý trạng thái thành viên" icon={<ShieldCheck />}>
          <div className="flex flex-wrap gap-2">
            {canUpdate && membership.status === "SUSPENDED" && (
              <Button size="sm" disabled={busy} onClick={() => onStatus("ACTIVE")}>
                <PlayCircle size={14} /> Kích hoạt lại
              </Button>
            )}
            {canUpdate && membership.status === "ACTIVE" && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus("SUSPENDED")}>
                <PauseCircle size={14} /> Tạm đình chỉ
              </Button>
            )}
            {canRemove && membership.status !== "LEFT" && (
              <Button size="sm" variant="destructive" disabled={busy} onClick={onLeave}>
                <UserMinus size={14} /> Cho rời CLB
              </Button>
            )}
          </div>
          {membership.status === "SUSPENDED" && (
            <p className="text-xs text-muted-foreground">
              Khi đang tạm đình chỉ, mọi quyền thuộc phạm vi CLB và Ban của thành viên này được tạm dừng hiệu lực cho tới khi kích hoạt lại.
            </p>
          )}
        </Section>
      )}
    </>
  );
}
