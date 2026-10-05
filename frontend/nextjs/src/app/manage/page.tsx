"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUser, Club, Department, Grant, Membership, UserSummary, addDepartmentMember, addMember, clubs, createClub, createDepartment, currentUser, departments, grantPermission, isAuthenticationError, members, myPermissions, revokePermission, updateClub, updateProfile, users } from "../../lib/api";
import styles from "./page.module.css";

const catalog = ["user.view", "club.view", "club.update", "member.view", "member.add", "department.view", "department.create", "department.member.add", "permission.assign", "permission.revoke"];

export default function ManagePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [clubList, setClubList] = useState<Club[]>([]);
  const [userList, setUserList] = useState<UserSummary[]>([]);
  const [memberList, setMemberList] = useState<Membership[]>([]);
  const [departmentList, setDepartmentList] = useState<Department[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [readyError, setReadyError] = useState("");
  const [profile, setProfile] = useState({ fullName: "", phone: "" });
  const [clubId, setClubId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [clubName, setClubName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [newClub, setNewClub] = useState({ code: "", name: "", description: "", field: "", contactEmail: "" });
  const [permission, setPermission] = useState(catalog[0]);
  const [scope, setScope] = useState<Grant["scope"]>("GLOBAL");
  const [resourceId, setResourceId] = useState("");
  const requestVersion = useRef(0);

  const can = (permissionName: string) => grants.some((grant) => grant.permission === permissionName);
  const token = () => localStorage.getItem("vju_access_token") ?? "";
  function notice(success: string) { setError(""); setMessage(success); }
  function fail(requestError: unknown) { setMessage(""); setError(requestError instanceof Error ? requestError.message : "Thao tác không thành công"); }
  function selectClub(nextClubId: string) {
    const selected = clubList.find((club) => club.clubId === nextClubId);
    setClubId(nextClubId); setClubName(selected?.name ?? ""); setDepartmentId(""); setDepartmentList([]); setMemberList([]);
  }

  useEffect(() => {
    const stored = localStorage.getItem("vju_access_token");
    if (!stored) { router.replace("/login"); return; }
    let cancelled = false;
    currentUser(stored).then(async (me) => {
      if (cancelled) return;
      setUser(me); setProfile({ fullName: me.fullName, phone: me.phone ?? "" });
      const [grantResult, clubResult] = await Promise.allSettled([myPermissions(stored), clubs(stored)]);
      if (cancelled) return;
      const ownGrants = grantResult.status === "fulfilled" ? grantResult.value : [];
      const ownClubs = clubResult.status === "fulfilled" ? clubResult.value : [];
      if ([grantResult, clubResult].some((result) => result.status === "rejected" && isAuthenticationError(result.reason))) {
        localStorage.removeItem("vju_access_token"); localStorage.removeItem("vju_user"); router.replace("/login"); return;
      }
      setGrants(ownGrants); setClubList(ownClubs);
      if (grantResult.status === "rejected" && !isAuthenticationError(grantResult.reason)) fail(grantResult.reason);
      if (clubResult.status === "rejected" && !isAuthenticationError(clubResult.reason)) setError("Bạn chưa có quyền xem danh sách CLB.");
      if (ownGrants.some((grant) => grant.permission === "user.view")) {
        try { setUserList(await users(stored)); } catch (requestError) { if (isAuthenticationError(requestError)) { localStorage.removeItem("vju_access_token"); localStorage.removeItem("vju_user"); router.replace("/login"); return; } fail(requestError); }
      }
      const firstClub = ownClubs[0];
      if (firstClub) { setClubId(firstClub.clubId); setClubName(firstClub.name); }
    }).catch((requestError) => {
      if (isAuthenticationError(requestError)) router.replace("/login"); else { setReadyError(requestError instanceof Error ? requestError.message : "Không thể tải không gian quản trị"); fail(requestError); }
    });
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!clubId || !token()) return;
    const version = ++requestVersion.current;
    const stored = token();
    Promise.allSettled([
      departments(stored, clubId),
      grants.some((grant) => grant.permission === "member.view") ? members(stored, clubId) : Promise.resolve([] as Membership[]),
    ]).then(([departmentResult, memberResult]) => {
      if (version !== requestVersion.current) return;
      if ([departmentResult, memberResult].some((result) => result.status === "rejected" && isAuthenticationError(result.reason))) {
        localStorage.removeItem("vju_access_token"); localStorage.removeItem("vju_user"); router.replace("/login"); return;
      }
      if (departmentResult.status === "fulfilled") { setDepartmentList(departmentResult.value); setDepartmentId(departmentResult.value[0]?.departmentId ?? ""); }
      if (memberResult.status === "fulfilled") setMemberList(memberResult.value);
      if (departmentResult.status === "rejected" && !isAuthenticationError(departmentResult.reason)) fail(departmentResult.reason);
      if (memberResult.status === "rejected" && !isAuthenticationError(memberResult.reason)) fail(memberResult.reason);
    });
  }, [clubId, grants, router]);

  async function submitProfile(event: FormEvent) { event.preventDefault(); try { const updated = await updateProfile(token(), profile.fullName, profile.phone); setUser(updated); setProfile({ fullName: updated.fullName, phone: updated.phone ?? "" }); notice("Đã cập nhật hồ sơ"); } catch (requestError) { fail(requestError); } }
  async function submitClub(event: FormEvent) { event.preventDefault(); try { const updated = await updateClub(token(), clubId, { name: clubName }); setClubList((items) => items.map((club) => club.clubId === updated.clubId ? updated : club)); notice("Đã cập nhật câu lạc bộ"); } catch (requestError) { fail(requestError); } }
  async function submitCreateClub(event: FormEvent) { event.preventDefault(); try { const created = await createClub(token(), newClub); setClubList((items) => [...items, created]); setNewClub({ code: "", name: "", description: "", field: "", contactEmail: "" }); setClubId(created.clubId); setClubName(created.name); setDepartmentId(""); setDepartmentList([]); setMemberList([]); notice("Đã tạo câu lạc bộ"); } catch (requestError) { fail(requestError); } }
  async function submitMember(event: FormEvent) { event.preventDefault(); try { const created = await addMember(token(), clubId, targetUserId); setMemberList((items) => items.some((item) => item.membershipId === created.membershipId) ? items : [...items, created]); notice("Đã thêm thành viên vào CLB"); } catch (requestError) { fail(requestError); } }
  async function submitDepartment(event: FormEvent) { event.preventDefault(); try { const created = await createDepartment(token(), clubId, departmentName, ""); setDepartmentList((items) => [...items, created]); setDepartmentId(created.departmentId); setDepartmentName(""); notice("Đã tạo department"); } catch (requestError) { fail(requestError); } }
  async function submitDepartmentMember(event: FormEvent) { event.preventDefault(); try { const selectedDepartment = departmentList.find((department) => department.departmentId === departmentId); if (!selectedDepartment || selectedDepartment.clubId !== clubId) throw new Error("Vui lòng chọn department thuộc CLB hiện tại"); await addDepartmentMember(token(), clubId, selectedDepartment.departmentId, targetUserId); notice("Đã phân thành viên vào department"); } catch (requestError) { fail(requestError); } }
  async function submitPermission(event: FormEvent) { event.preventDefault(); try { await grantPermission(token(), targetUserId, permission, scope, resourceId); notice("Đã cấp permission"); } catch (requestError) { fail(requestError); } }
  async function submitRevoke(event: FormEvent) { event.preventDefault(); try { await revokePermission(token(), targetUserId, permission, scope, resourceId); notice("Đã thu hồi permission"); } catch (requestError) { fail(requestError); } }

  if (!user) return <main className={styles.loading}>{readyError || "Đang tải không gian quản trị..."}</main>;
  const selectedClub = clubList.find((club) => club.clubId === clubId);
  const selectClubProps = { value: clubId, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => selectClub(event.target.value), required: true };
  return <main className={styles.page}><header className={styles.header}><Link href="/" className={styles.back}>← Dashboard</Link><div><p>SPRINT 1 DEMO WORKFLOW</p><h1>Không gian quản lý</h1></div><span className={styles.user}>{user.fullName}</span></header>{message && <p className={styles.success}>{message}</p>}{error && <p className={styles.error}>{error}</p>}
    <section className={styles.workflow}><strong>Quy trình:</strong> chọn user, thêm vào CLB, phân vào ban, sau đó cấp/thu hồi permission.</section>
    <section className={styles.grid}>
      <form className={styles.card} onSubmit={submitProfile}><p className={styles.kicker}>PROFILE</p><h2>Hồ sơ cá nhân</h2><label>Họ và tên<input value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} required /></label><label>Số điện thoại<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label><button>Cập nhật hồ sơ</button></form>
      {can("club.create") && <form className={styles.card} onSubmit={submitCreateClub}><p className={styles.kicker}>CLUB CREATION</p><h2>Tạo CLB</h2><label>Mã CLB<input value={newClub.code} onChange={(event) => setNewClub({ ...newClub, code: event.target.value })} required /></label><label>Tên CLB<input value={newClub.name} onChange={(event) => setNewClub({ ...newClub, name: event.target.value })} required /></label><button>Tạo câu lạc bộ</button></form>}
      {can("club.view") && <form className={styles.card} onSubmit={submitClub}><p className={styles.kicker}>CLUB MANAGEMENT</p><h2>Chỉnh sửa CLB</h2><label>CLB<select {...selectClubProps}>{clubList.map((club) => <option key={club.clubId} value={club.clubId}>{club.name}</option>)}</select></label><label>Tên mới<input value={clubName} onChange={(event) => setClubName(event.target.value)} required /></label><button>{can("club.update") ? "Lưu thay đổi CLB" : "Thử sửa CLB (403 expected)"}</button></form>}
      {can("member.add") && <form className={styles.card} onSubmit={submitMember}><p className={styles.kicker}>MEMBERSHIP</p><h2>Thêm thành viên vào CLB</h2><label>Người dùng<select value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} required>{userList.map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidate.fullName} · {candidate.email}</option>)}</select></label><label>CLB<select {...selectClubProps}>{clubList.map((club) => <option key={club.clubId} value={club.clubId}>{club.name}</option>)}</select></label><button>Thêm membership</button></form>}
      {can("member.view") && <section className={styles.card}><p className={styles.kicker}>MEMBER MANAGEMENT</p><h2>Danh sách thành viên</h2>{memberList.length === 0 ? <p className={styles.muted}>CLB chưa có thành viên.</p> : <div className={styles.memberList}>{memberList.map((member) => <article key={member.membershipId}><strong>{member.userId}</strong><span>{member.status}</span></article>)}</div>}</section>}
      {can("department.create") && <form className={styles.card} onSubmit={submitDepartment}><p className={styles.kicker}>DEPARTMENT</p><h2>Tạo ban</h2><label>CLB<select {...selectClubProps}>{clubList.map((club) => <option key={club.clubId} value={club.clubId}>{club.name}</option>)}</select></label><label>Tên ban<input value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} required /></label><button>Tạo department</button></form>}
      {can("department.member.add") && <form className={styles.card} onSubmit={submitDepartmentMember}><p className={styles.kicker}>DEPARTMENT MEMBER</p><h2>Phân member vào ban</h2><label>Member<select value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} required>{userList.map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidate.fullName}</option>)}</select></label><label>Department<select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} required>{departmentList.map((department) => <option key={department.departmentId} value={department.departmentId}>{department.name}</option>)}</select></label><button>Phân vào ban</button></form>}
      {can("permission.assign") && <form className={styles.card} onSubmit={submitPermission}><p className={styles.kicker}>AUTHORIZATION</p><h2>Cấp permission</h2><label>User<select value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} required>{userList.map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidate.fullName}</option>)}</select></label><label>Permission<select value={permission} onChange={(event) => setPermission(event.target.value)}>{catalog.map((item) => <option key={item}>{item}</option>)}</select></label><label>Scope<select value={scope} onChange={(event) => setScope(event.target.value as Grant["scope"])}><option>GLOBAL</option><option>CLUB</option><option>DEPARTMENT</option></select></label><label>Resource ID<input value={resourceId} onChange={(event) => setResourceId(event.target.value)} placeholder={scope === "CLUB" ? selectedClub?.clubId : "Bỏ trống nếu GLOBAL"} /></label><button>Cấp permission</button></form>}
      {can("permission.revoke") && <form className={styles.card} onSubmit={submitRevoke}><p className={styles.kicker}>AUTHORIZATION</p><h2>Thu hồi permission</h2><label>User<select value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} required>{userList.map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidate.fullName}</option>)}</select></label><label>Permission<select value={permission} onChange={(event) => setPermission(event.target.value)}>{catalog.map((item) => <option key={item}>{item}</option>)}</select></label><label>Scope<select value={scope} onChange={(event) => setScope(event.target.value as Grant["scope"])}><option>GLOBAL</option><option>CLUB</option><option>DEPARTMENT</option></select></label><label>Resource ID<input value={resourceId} onChange={(event) => setResourceId(event.target.value)} /></label><button>Thu hồi permission</button></form>}
    </section><section className={styles.list}><p className={styles.kicker}>CLB ĐANG CÓ</p><h2>Dữ liệu hệ thống</h2>{clubList.map((club) => <article key={club.clubId}><strong>{club.name}</strong><span>{club.code} · {club.status}</span></article>)}</section></main>;
}
