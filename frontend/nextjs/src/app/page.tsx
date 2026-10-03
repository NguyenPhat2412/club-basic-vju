"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUser, Grant, MyMembership, currentUser, myMemberships, myPermissions, logout } from "../lib/api";
import styles from "./page.module.css";

function initials(value: string) { return value.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase(); }

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [myClubList, setMyClubList] = useState<MyMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = typeof window === "undefined" ? "" : localStorage.getItem("vju_access_token") ?? "";
  const can = (permission: string) => grants.some((grant) => grant.permission === permission);

  useEffect(() => {
    const stored = localStorage.getItem("vju_access_token");
    if (!stored) { router.replace("/login"); return; }
    Promise.all([currentUser(stored), myPermissions(stored), myMemberships(stored)]).then(([me, ownGrants, ownMemberships]) => {
      setUser(me); setGrants(ownGrants); setMyClubList(ownMemberships); setLoading(false);
    }).catch(() => { setError("Không thể tải dữ liệu workspace"); localStorage.removeItem("vju_access_token"); router.replace("/login"); });
  }, [router]);

  async function signOut() { await logout(token); localStorage.removeItem("vju_access_token"); localStorage.removeItem("vju_user"); router.replace("/login"); }

  if (loading || !user) return <main className={styles.loading}>Đang tải không gian VJU Clubs...</main>;
  const canViewDepartments = can("department.view");
  const canManage = can("club.create") || can("department.create") || can("permission.assign");

  return <div className={styles.page}>
    <aside className={styles.sidebar}><div className={styles.brand}><div className={styles.brandMark}>VJ</div><div><strong>VJU CLUBS</strong><span>Student community</span></div></div>
      <nav className={styles.navigation} aria-label="Điều hướng chính"><p className={styles.navLabel}>KHÔNG GIAN</p><a className={`${styles.navItem} ${styles.navItemActive}`} href="#overview"><span className={styles.navIcon}>⌂</span>Tổng quan</a><p className={styles.navLabel}>QUẢN TRỊ</p>{canViewDepartments && <a className={styles.navItem} href="#departments"><span className={styles.navIcon}>▦</span>Cơ cấu ban</a>}{canManage && <Link className={styles.navItem} href="/manage"><span className={styles.navIcon}>◇</span>Manage</Link>}</nav>
      <div className={styles.sidebarFooter}><div className={styles.helpCard}><span className={styles.helpIcon}>?</span><div><strong>Cần hỗ trợ?</strong><span>Trung tâm trợ giúp VJU</span></div></div><div className={styles.profileMini}><div className={styles.avatar}>{initials(user.fullName)}</div><div><strong>{user.fullName}</strong><span>{user.email}</span></div></div></div>
    </aside>
    <main className={styles.main} id="overview"><header className={styles.header}><div className={styles.breadcrumb}><span>Trang chủ</span><b>/</b> Workspace</div><div className={styles.headerActions}><Link className={styles.manageLink} href="/manage">Mở Manage →</Link><button className={styles.logoutButton} onClick={signOut}>Đăng xuất</button><div className={styles.headerProfile}><div className={styles.avatar}>{initials(user.fullName)}</div><span>{user.fullName}</span></div></div></header>
      {error && <p className={styles.error}>{error}</p>}<section className={styles.welcome}><div><p className={styles.eyebrow}>WORKSPACE CỦA BẠN</p><h1>Chào buổi sáng, {user.fullName} <span>✦</span></h1><p className={styles.welcomeText}>Quản lý CLB, thành viên, ban và permission từ một nơi.</p></div>{can("club.create") && <Link className={styles.primaryButton} href="/manage">+ Tạo câu lạc bộ</Link>}</section>
      <section className={styles.statsGrid} aria-label="Tổng quan hệ thống"><article className={styles.statCard}><div className={`${styles.statIcon} ${styles.blueIcon}`}>◇</div><div><span>Permission của bạn</span><strong>{grants.length}</strong><small>Scope linh hoạt</small></div></article><article className={styles.statCard}><div className={`${styles.statIcon} ${styles.goldIcon}`}>▦</div><div><span>Ban của bạn</span><strong>{myClubList.reduce((total, item) => total + item.departments.length, 0)}</strong><small>Trong các CLB đã tham gia</small></div></article></section>
      <section className={`${styles.panel} ${styles.clubPanel}`} id="my-memberships"><div className={styles.panelHeading}><div><p className={styles.sectionKicker}>MY COMMUNITY</p><h2>CLB và ban của bạn</h2></div></div>{myClubList.length === 0 ? <p className={styles.empty}>Bạn chưa là thành viên của CLB nào.</p> : <div className={styles.membershipList}>{myClubList.map((item) => <article className={styles.membershipCard} key={item.membershipId}><div className={`${styles.clubLogo} ${styles.clubLogoRed}`}>VJ</div><div><strong>{item.club.name}</strong><span>{item.club.code} · {item.status}</span><div className={styles.membershipDepartments}>{item.departments.length === 0 ? <em>Chưa được phân vào ban</em> : item.departments.map((department) => <b key={department.departmentId}>{department.name}</b>)}</div></div></article>)}</div>}</section>
      <footer className={styles.footer}><span>© 2026 VJU Clubs Management</span><span>API connected · PostgreSQL</span><Link href="/manage">Manage account →</Link></footer>
    </main></div>;
}
