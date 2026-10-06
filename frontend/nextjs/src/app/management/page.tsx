"use client";

import { useEffect, useMemo, useState } from "react";
import { apiModel, Application, Club, Department, DepartmentMember, Membership } from "@/lib/api";
import { Shell, Status } from "@/components/Shell";

type AssignmentMap = Record<string, DepartmentMember[]>;

export default function Management() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selected, setSelected] = useState<Club | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [memberDetail, setMemberDetail] = useState<Membership | null>(null);
  const [tab, setTab] = useState<"applications" | "members">("applications");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([apiModel.clubs(), apiModel.effectivePermissions()]).then(([result, permissions]) => {
      const relevant = permissions.filter((permission) => MANAGEMENT_PERMISSIONS.has(permission.permissionKey));
      const hasGlobal = relevant.some((permission) => permission.scope === "GLOBAL");
      const clubIds = new Set(relevant.map((permission) => permission.clubId).filter((clubId): clubId is string => Boolean(clubId)));
      setClubs(hasGlobal || clubIds.size === 0 ? result.items : result.items.filter((club) => clubIds.has(club.id)));
    }).catch((reason) => setError(message(reason, "Không thể tải danh sách CLB")));
  }, []);

  const load = async (club: Club) => {
    setSelected(club);
    setMemberDetail(null);
    setTab("applications");
    setError("");
    setLoading(true);
    try {
      // Application review and member assignment use separate permissions. Keep the
      // review surface usable when a reviewer has no department-management grant.
      try {
        const applicationPage = await apiModel.clubApplications(club.id);
        setApps(applicationPage.items);
      } catch (reason) {
        setApps([]);
        setError(message(reason, "Bạn không có quyền xem đơn của CLB này"));
      }
      try {
        const [membershipPage, departmentPage] = await Promise.all([
          apiModel.clubMemberships(club.id),
          apiModel.departments(club.id),
        ]);
        setMembers(membershipPage.items);
        setDepartments(departmentPage.items.filter((department) => department.status === "ACTIVE"));
        const memberPages = await Promise.all(departmentPage.items.map((department) => apiModel.departmentMembers(department.id)));
        setAssignments(Object.fromEntries(departmentPage.items.map((department, index) => [department.id, memberPages[index].items])));
      } catch {
        setMembers([]);
        setDepartments([]);
        setAssignments({});
      }
    } finally {
      setLoading(false);
    }
  };

  const review = async (application: Application, approve: boolean) => {
    if (!selected) return;
    setError("");
    try {
      if (approve) await apiModel.approve(selected.id, application.id, "Reviewed in ClubHub");
      else await apiModel.reject(selected.id, application.id, "Reviewed in ClubHub");
      await load(selected);
    } catch (reason) {
      setError(message(reason, "Không thể xét duyệt đơn"));
    }
  };

  const assignmentByMembership = useMemo(() => {
    const result: Record<string, Department[]> = {};
    for (const department of departments) {
      for (const assignment of assignments[department.id] ?? []) {
        result[assignment.membershipId] = [...(result[assignment.membershipId] ?? []), department];
      }
    }
    return result;
  }, [assignments, departments]);

  const assign = async (departmentId: string, membershipId: string) => {
    if (!departmentId) return;
    setError("");
    try {
      const assignment = await apiModel.addDepartmentMember(departmentId, membershipId);
      setAssignments((current) => ({ ...current, [departmentId]: [...(current[departmentId] ?? []), assignment] }));
    } catch (reason) {
      setError(message(reason, "Không thể thêm thành viên vào ban"));
    }
  };

  const remove = async (departmentId: string, membershipId: string) => {
    setError("");
    try {
      await apiModel.removeDepartmentMember(departmentId, membershipId);
      setAssignments((current) => ({
        ...current,
        [departmentId]: (current[departmentId] ?? []).filter((assignment) => assignment.membershipId !== membershipId),
      }));
    } catch (reason) {
      setError(message(reason, "Không thể gỡ thành viên khỏi ban"));
    }
  };

  const inspectMember = async (membershipId: string) => {
    setError("");
    try { setMemberDetail(await apiModel.membership(membershipId)); }
    catch (reason) { setError(message(reason, "Không thể tải chi tiết thành viên")); }
  };

  const updateMemberStatus = async (status: string) => {
    if (!memberDetail) return;
    setError("");
    try {
      const updated = await apiModel.updateMembership(memberDetail.id, status);
      setMemberDetail(updated);
      setMembers((current) => current.map((member) => member.id === updated.id ? { ...member, status: updated.status } : member));
    } catch (reason) { setError(message(reason, "Không thể cập nhật trạng thái thành viên")); }
  };

  return (
    <Shell>
      <section className="content">
        <div className="eyebrow">MANAGEMENT</div>
        <h1>Quản lý thành viên</h1>
        <p className="lede">Xét duyệt hồ sơ, xem thành viên và phân thành viên vào ban.</p>
        {error && <div className="error">{error}</div>}
        <div className="management-grid">
          <div className="panel club-picker">
            {clubs.length === 0 ? <div className="empty">Không có CLB để quản lý.</div> : clubs.map((club) => (
              <button className={selected?.id === club.id ? "selected" : ""} key={club.id} onClick={() => load(club)}>
                <b>{club.name}</b><small>{club.code}</small>
              </button>
            ))}
          </div>
          <div className="panel">
            <div className="section-heading compact">
              <div><h2>{selected?.name || "Chưa chọn CLB"}</h2><small>{selected ? `${members.length} thành viên hoạt động` : "Chọn một CLB để bắt đầu"}</small></div>
              {selected && <div className="tabs"><button className={tab === "applications" ? "tab active" : "tab"} onClick={() => setTab("applications")}>Đơn đăng ký</button><button className={tab === "members" ? "tab active" : "tab"} onClick={() => setTab("members")}>Thành viên & ban</button></div>}
            </div>
            {!selected ? <div className="empty">Chọn CLB ở bên trái.</div> : loading ? <div className="loading">Đang tải dữ liệu…</div> : tab === "applications" ? (
              apps.length === 0 ? <div className="empty">Không có đơn đăng ký nào.</div> : apps.map((application) => (
                <div className="review-row" key={application.id}>
                  <div><b>{application.clubName}</b><small>{application.message}</small></div>
                  <div className="review-actions"><Status value={application.status}/>{application.status === "PENDING" && <><button onClick={() => review(application, true)}>Duyệt</button><button className="danger" onClick={() => review(application, false)}>Từ chối</button></>}</div>
                </div>
              ))
            ) : (
              <>
              {memberDetail && <div className="member-detail success"><b>Chi tiết thành viên</b><span>User ID: {memberDetail.userId}</span><span>Trạng thái: <Status value={memberDetail.status}/></span><div className="review-actions"><button onClick={() => updateMemberStatus("SUSPENDED")}>Tạm ngưng</button><button className="danger" onClick={() => updateMemberStatus("LEFT")}>Cho rời CLB</button></div></div>}
              {members.length === 0 ? <div className="empty">CLB chưa có thành viên hoạt động.</div> : members.map((membership) => {
                const assigned = assignmentByMembership[membership.id] ?? [];
                return <div className="member-row" key={membership.id}>
                  <div><b>Thành viên {membership.userId.slice(0, 8)}</b><small>{membership.userId} · tham gia {membership.joinedAt ? new Date(membership.joinedAt).toLocaleDateString("vi-VN") : "chưa rõ"}</small><div className="departments">{assigned.length ? assigned.map((department) => <span className="tag" key={department.id}>{department.name}<button className="chip-remove" title="Gỡ khỏi ban" onClick={() => remove(department.id, membership.id)}>×</button></span>) : <span className="muted">Chưa vào ban</span>}</div></div>
                  <div className="member-actions"><button className="secondary-button" onClick={() => inspectMember(membership.id)}>Chi tiết</button>
                  <select aria-label={`Phân thành viên ${membership.userId.slice(0, 8)} vào ban`} defaultValue="" onChange={(event) => { void assign(event.target.value, membership.id); event.currentTarget.value = ""; }}><option value="">Thêm vào ban…</option>{departments.filter((department) => !assigned.some((item) => item.id === department.id)).map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}</select>
                  </div>
                </div>;
              })}
              </>
            )}
          </div>
        </div>
      </section>
    </Shell>
  );
}

function message(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

const MANAGEMENT_PERMISSIONS = new Set(["application.view", "application.review", "application.approve", "application.reject", "member.view", "department.member.add"]);
