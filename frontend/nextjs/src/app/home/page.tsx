"use client";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Building2,
  ChevronRight,
  Compass,
  LogIn,
  Menu,
  Search,
  Sparkles,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import { apiModel, Club } from "@/lib/api";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { useThemePreference } from "@/hooks/useThemePreference";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DetailList, EntityDrawer } from "@/components/shared/Overlays";

const MANAGE_KEYS = ["application.view", "application.review", "application.approve", "application.reject", "member.view", "department.member.add"];

type ClubCard = {
  id: string;
  code: string;
  name: string;
  description: string;
  activityField: string;
  status: string;
  contactEmail?: string;
  summary: string;
  highlights: string[];
  mode: "public" | "live";
};

const PUBLIC_CLUBS: ClubCard[] = [
  {
    id: "public-academics",
    code: "VJU-ACA",
    name: "CLB Học thuật & Công nghệ",
    description: "Không gian dành cho sinh viên thích nghiên cứu, lập trình, sản phẩm số và chia sẻ kiến thức.",
    activityField: "Academic",
    status: "ACTIVE",
    summary: "Tập trung workshop, nghiên cứu nhỏ, mentoring và các dự án học thuật có thể tham gia ngay.",
    highlights: ["Workshop định kỳ", "Dự án sinh viên", "Chia sẻ tài nguyên học tập"],
    mode: "public",
  },
  {
    id: "public-community",
    code: "VJU-COM",
    name: "CLB Cộng đồng & Tình nguyện",
    description: "Kết nối sinh viên với các hoạt động vì cộng đồng, hỗ trợ sự kiện và chiến dịch xã hội.",
    activityField: "Community",
    status: "ACTIVE",
    summary: "Phù hợp cho người thích tổ chức sự kiện, kết nối người mới và tham gia hoạt động thiện nguyện.",
    highlights: ["Sự kiện cộng đồng", "Tình nguyện", "Kết nối tân sinh viên"],
    mode: "public",
  },
  {
    id: "public-culture",
    code: "VJU-CUL",
    name: "CLB Văn hoá & Truyền thông",
    description: "Tập trung truyền thông hình ảnh, nội dung đa phương tiện và các hoạt động giao lưu văn hoá.",
    activityField: "Media",
    status: "ACTIVE",
    summary: "Phù hợp để giới thiệu CLB, vận hành truyền thông, thiết kế và kể chuyện bằng hình ảnh.",
    highlights: ["Truyền thông sự kiện", "Thiết kế nội dung", "Giao lưu văn hoá"],
    mode: "public",
  },
  {
    id: "public-sports",
    code: "VJU-SPORT",
    name: "CLB Thể thao & Sức khoẻ",
    description: "Hoạt động thể chất, giải đấu nội bộ và chương trình rèn luyện thói quen lành mạnh.",
    activityField: "Sports",
    status: "ACTIVE",
    summary: "Nơi phù hợp để rèn luyện, tổ chức giải giao hữu và tạo nhịp sinh hoạt cân bằng.",
    highlights: ["Giải nội bộ", "Rèn luyện định kỳ", "Môi trường năng động"],
    mode: "public",
  },
];

const NEWS = [
  { title: "Bảng tin CLB học thuật mở đăng ký mùa mới", date: "2026-10-08", category: "Tin tức chung" },
  { title: "Tuần lễ chào đón tân sinh viên tại các CLB", date: "2026-10-02", category: "Hoạt động" },
  { title: "Workshop truyền thông và thiết kế nhận diện cho CLB", date: "2026-10-01", category: "Thông báo" },
];

const HIGHLIGHTS = [
  { title: "Công khai", text: "Người chưa đăng nhập vẫn xem được phần giới thiệu của CLB." },
  { title: "Cá nhân hoá", text: "Người đã đăng nhập thấy dashboard, membership và hồ sơ." },
  { title: "Theo vai trò", text: "Menu quản lý hiển thị theo quyền thực tế của tài khoản." },
];

function mapClub(club: Club): ClubCard {
  const description = club.description || "CLB đang cập nhật thông tin công khai.";
  return {
    id: club.id,
    code: club.code,
    name: club.name,
    description,
    activityField: club.activityField || "General",
    status: club.status,
    contactEmail: club.contactEmail,
    summary: description,
    highlights: [club.activityField || "Hoạt động học thuật", club.status === "ACTIVE" ? "Đang hoạt động" : "Đang cập nhật", club.contactEmail ? `Liên hệ ${club.contactEmail}` : "Thông tin công khai giới hạn"],
    mode: "live",
  };
}

export default function HomePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useOptionalSession();
  const { dark, toggleTheme } = useThemePreference();
  const [search, setSearch] = useState("");
  const [selectedClub, setSelectedClub] = useState<ClubCard | null>(null);

  const clubsQuery = useQuery({ queryKey: ["home", "clubs"], queryFn: () => apiModel.clubs("", "", 0, 8), enabled: !!session.user, placeholderData: keepPreviousData });
  const membershipsQuery = useQuery({ queryKey: ["home", "memberships"], queryFn: apiModel.myMemberships, enabled: !!session.user });
  const notificationsQuery = useQuery({ queryKey: ["home", "notifications"], queryFn: apiModel.notifications, enabled: !!session.user });

  const clubs = useMemo(() => {
    const items = session.user ? (clubsQuery.data?.items ?? []).map(mapClub) : PUBLIC_CLUBS;
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((club) => [club.code, club.name, club.description, club.activityField, club.summary, ...club.highlights].join(" ").toLowerCase().includes(query));
  }, [clubsQuery.data?.items, search, session.user]);

  const scope = session.user ? session.clubsWith(MANAGE_KEYS) : { global: false, ids: new Set<string>() };
  const manageable = session.user && clubsQuery.data ? clubsQuery.data.items.filter((club) => scope.global || scope.ids.has(club.id)).map(mapClub) : [];
  const unreadNotifications = notificationsQuery.data?.items.filter((n) => !n.read).length ?? 0;
  const isAuthenticated = !!session.user;
  const dashboardClubs = membershipsQuery.data?.items ?? [];

  const signOut = async () => {
    await apiModel.logout().catch(() => undefined);
    queryClient.clear();
    router.push("/home");
  };

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const topMenu = isAuthenticated
    ? [
        { label: "Dashboard", icon: <Star size={15} />, onClick: () => jump("dashboard") },
        { label: "Câu lạc bộ", icon: <Compass size={15} />, onClick: () => jump("clubs") },
        { label: "Hồ sơ", icon: <UserRound size={15} />, onClick: () => router.push("/profile") },
      ]
    : [
        { label: "Câu lạc bộ", icon: <Compass size={15} />, onClick: () => jump("clubs") },
        { label: "Đăng nhập", icon: <LogIn size={15} />, onClick: () => router.push("/login") },
        { label: "Đăng kí", icon: <ArrowRight size={15} />, onClick: () => router.push("/register") },
      ];

  return (
    <main className="min-h-svh bg-white text-foreground dark:bg-[#0f1726]">
      <div className="border-b border-border/60 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f1726]/90">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/home" className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/20">VJU</span>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Trường Đại học Việt Nhật</p>
              <p className="text-sm font-black tracking-tight text-foreground dark:text-white">ClubHub</p>
            </div>
          </Link>
          <div className="hidden flex-1 items-center justify-center gap-2 lg:flex">
            {topMenu.map((item) => <TopNavButton key={item.label} {...item} />)}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Button variant="outline" size="sm" onClick={() => router.push("/profile")} className="rounded-full">Hồ sơ</Button>
                <Button variant="outline" size="sm" onClick={signOut} className="rounded-full text-destructive hover:bg-destructive/10">Đăng xuất</Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => router.push("/login")} className="rounded-full">Đăng nhập</Button>
                <Button size="sm" onClick={() => router.push("/register")} className="rounded-full">Đăng kí</Button>
              </>
            )}
            <button aria-label="Chuyển giao diện sáng/tối" onClick={toggleTheme} className="relative hidden h-10 w-[60px] rounded-full border border-border/70 bg-muted/60 p-0.5 sm:block">
              <span className={cn("flex size-9 items-center justify-center rounded-full bg-background shadow-sm transition-transform", dark && "translate-x-5")}>
                {dark ? <Sparkles size={14} className="text-primary" /> : <Menu size={14} className="text-primary" />}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-border/60 bg-[linear-gradient(180deg,rgba(204,51,102,0.05),transparent)] dark:bg-[linear-gradient(180deg,rgba(126,166,255,0.05),transparent)]">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground sm:px-6 lg:px-8">
          <span className="font-semibold text-primary">Menu</span>
          <span>•</span>
          <button onClick={() => jump("intro")} className="hover:text-foreground">Giới thiệu</button>
          <span>•</span>
          <button onClick={() => jump("programs")} className="hover:text-foreground">CLB</button>
          <span>•</span>
          <button onClick={() => jump("news")} className="hover:text-foreground">Tin tức</button>
          <span>•</span>
          <button onClick={() => jump("activities")} className="hover:text-foreground">Hoạt động</button>
          <span>•</span>
          <button onClick={() => jump("contact")} className="hover:text-foreground">Liên hệ</button>
        </div>
      </div>

      <section className="relative overflow-hidden border-b border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(204,51,102,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(204,51,102,0.08),transparent_26%),linear-gradient(180deg,#f8fbff,white)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(126,166,255,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(255,100,103,0.08),transparent_26%),linear-gradient(180deg,#0f1726,#0b1020)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-10">
          <div className="relative overflow-hidden rounded-[2rem] border border-primary/10 bg-[linear-gradient(135deg,rgba(204,51,102,0.96),rgba(166,32,79,0.94))] p-6 text-white shadow-2xl shadow-primary/20 sm:p-8">
            <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_0.9rem),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.24),transparent_1rem),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.15),transparent_1.25rem)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90">
                <Sparkles size={13} /> Cổng thông tin câu lạc bộ
              </div>
              <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                Một nơi để xem CLB, theo dõi hoạt động và quản lý theo đúng vai trò của bạn.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
                Giao diện này được làm theo tinh thần cổng thông tin của VJU: nền sáng, banner lớn, khối nội dung rõ ràng và menu ngang tối giản. Người chưa đăng nhập chỉ thấy phần công khai; người đã đăng nhập sẽ thấy dashboard và lối đi cá nhân hoá.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => jump("clubs")} className="rounded-full bg-white px-5 font-bold text-primary hover:bg-white/95">Khám phá CLB</Button>
                <Button variant="outline" onClick={() => router.push(isAuthenticated ? "/profile" : "/login")} className="rounded-full border-white/25 bg-white/10 px-5 font-bold text-white hover:bg-white/15">
                  {isAuthenticated ? "Hồ sơ cá nhân" : "Đăng nhập"}
                </Button>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {HIGHLIGHTS.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/90">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="rounded-[2rem] border border-border/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Tổng quan</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">{isAuthenticated ? "Chế độ cá nhân hoá" : "Chế độ công khai"}</h2>
              <div className="mt-4 grid gap-3">
                <MiniStat label="CLB công khai" value={String(session.user ? clubsQuery.data?.total ?? 0 : PUBLIC_CLUBS.length)} />
                <MiniStat label="CLB tham gia" value={String(dashboardClubs.length)} />
                <MiniStat label="Quản lý khả dụng" value={String(manageable.length)} />
              </div>
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="border-b border-border/60 px-5 py-4 dark:border-white/10">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Menu nhanh</p>
              </div>
              <div className="grid gap-2 p-4">
                {topMenu.map((item) => (
                  <button key={item.label} onClick={item.onClick} className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3 text-left text-sm font-semibold transition-colors hover:border-primary/30 hover:bg-primary/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                    <span className="flex items-center gap-2">{item.icon}{item.label}</span>
                    <ChevronRight size={15} className="text-primary" />
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {isAuthenticated && (
        <section id="dashboard" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Dashboard" title="Thông tin cá nhân hoá" description="Từ đây đi thẳng tới CLB bạn tham gia, thông báo gần nhất và các khu vực quản lý theo quyền." />
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-border/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="grid gap-3 sm:grid-cols-3">
                <QuickTile title="CLB đang tham gia" value={String(dashboardClubs.length)} onClick={() => router.push("/memberships")} />
                <QuickTile title="Thông báo chưa đọc" value={String(unreadNotifications)} onClick={() => router.push("/notifications")} />
                <QuickTile title="CLB quản lý" value={String(manageable.length)} onClick={() => router.push(manageable.length ? "/management" : "/login")} disabled={!manageable.length} />
              </div>
            </div>
            <div className="rounded-[2rem] border border-border/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Hoạt động gần đây</p>
                  <h3 className="mt-1 text-lg font-black">Thông báo của bạn</h3>
                </div>
                <CountBadge>{notificationsQuery.data?.items.length ?? 0}</CountBadge>
              </div>
              <div className="mt-4 grid gap-2">
                {(notificationsQuery.data?.items ?? []).slice(0, 3).map((item) => (
                  <button key={item.id} onClick={() => router.push("/notifications")} className={cn("rounded-2xl border p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5", item.read ? "border-border/70 bg-background" : "border-primary/20 bg-primary/5")}> 
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">{item.title}</p>
                      {!item.read && <Badge tone="primary">Mới</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                  </button>
                ))}
                {!notificationsQuery.data?.items.length && <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">Chưa có thông báo mới.</div>}
              </div>
            </div>
          </div>
        </section>
      )}

      <section id="clubs" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Câu lạc bộ" title="Khám phá CLB" description="Khi chưa đăng nhập, bạn xem được phần giới thiệu công khai. Khi đăng nhập, dữ liệu thực sẽ hiện theo quyền và vai trò." />
        <div className="rounded-[2rem] border border-border/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col gap-4 border-b border-border/60 pb-4 lg:flex-row lg:items-end lg:justify-between dark:border-white/10">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Tìm nhanh</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">Danh sách bên dưới được trình bày theo tinh thần thẻ nội dung của VJU: rõ, gọn, nhiều khoảng trống và nhấn vào tiêu đề.</p>
            </div>
            <div className="w-full max-w-md">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo mã, tên, lĩnh vực…" className="h-11 rounded-full pl-9" />
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {clubs.map((club) => <ClubPreviewCard key={club.id} club={club} onOpen={() => setSelectedClub(club)} />)}
          </div>
        </div>
      </section>

      <section id="programs" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Chương trình" title="Trải nghiệm nhanh" description="Một vài lối đi chính để người dùng không phải tìm quá lâu trong hệ thống." />
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard icon={<Compass size={18} />} title="Khám phá CLB" text="Xem CLB công khai, thông tin liên hệ, tổng quan và các điểm nổi bật." />
          <FeatureCard icon={<Users size={18} />} title="Quản lý theo vai trò" text="Khu vực quản lý và tài liệu chỉ hiện với người có quyền thực tế." />
          <FeatureCard icon={<BookOpen size={18} />} title="Hồ sơ cá nhân" text="Xem hồ sơ, đổi mật khẩu và đi thẳng đến các mục cá nhân hoá." />
        </div>
      </section>

      <section id="news" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Tin tức & Sự kiện" title="Bảng tin gần đây" description="Bố cục này mô phỏng nhịp nội dung của site VJU: có danh mục, ngày tháng và tiêu đề nổi bật." />
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3 rounded-[2rem] border border-border/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            {NEWS.map((item) => (
              <article key={item.title} className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-background p-4 dark:border-white/10 dark:bg-white/5">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{item.category}</p>
                  <h3 className="mt-1 line-clamp-2 text-base font-black tracking-tight">{item.title}</h3>
                </div>
                <span className="whitespace-nowrap text-xs font-semibold text-primary">{item.date}</span>
              </article>
            ))}
          </div>
          <div className="rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,rgba(204,51,102,0.95),rgba(166,32,79,0.92))] p-5 text-white shadow-lg shadow-primary/20 dark:border-white/10">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">Thông điệp</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight">Một cổng chung, nhiều lớp truy cập</h3>
            <p className="mt-3 text-sm leading-7 text-white/85">Người xem ngoài không bị chặn khỏi bối cảnh chung, còn người có tài khoản sẽ được dẫn vào khu vực cá nhân hoá, đúng với cách một cổng thông tin đại học nên vận hành.</p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Khách</p>
                <p className="mt-1 text-sm text-white/90">Chỉ xem công khai, giới thiệu CLB và tin tức.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Thành viên</p>
                <p className="mt-1 text-sm text-white/90">Xem dashboard, membership, hồ sơ và thông báo.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="activities" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Hoạt động" title="Không gian tương tác" description="Tạo cảm giác giống trang tin tức/hoạt động của VJU bằng các khối nội dung có ảnh hưởng thị giác mạnh hơn." />
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2 rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,rgba(204,51,102,0.08),rgba(204,51,102,0.02))] p-5 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(126,166,255,0.12),rgba(126,166,255,0.04))]">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Ảnh minh hoạ</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="aspect-[4/3] rounded-3xl bg-[linear-gradient(135deg,rgba(204,51,102,0.95),rgba(166,32,79,0.85))]" />
              <div className="aspect-[4/3] rounded-3xl border border-primary/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(204,51,102,0.22))]" />
            </div>
          </div>
          <div className="rounded-[2rem] border border-border/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Tác vụ nhanh</p>
            <div className="mt-4 grid gap-2">
              <QuickLink label="Xem CLB" onClick={() => jump("clubs")} />
              <QuickLink label="Đăng nhập" onClick={() => router.push("/login")} />
              <QuickLink label="Đăng kí" onClick={() => router.push("/register")} />
              <QuickLink label="Hồ sơ cá nhân" onClick={() => router.push(isAuthenticated ? "/profile" : "/login")} />
            </div>
          </div>
          <div className="rounded-[2rem] border border-border/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Số liệu</p>
            <div className="mt-4 grid gap-3">
              <MiniStat label="CLB công khai" value={String(session.user ? clubsQuery.data?.total ?? 0 : PUBLIC_CLUBS.length)} />
              <MiniStat label="Thông báo mới" value={String(unreadNotifications)} />
              <MiniStat label="Quản lý khả dụng" value={String(manageable.length)} />
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-border/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <SectionHeading eyebrow="Liên hệ" title="Thông tin tiếp cận" description="Khối cuối này giữ tinh thần cổng đại học: địa chỉ, liên hệ, và lối vào cho các nhóm người dùng khác nhau." />
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <ContactCard title="Trường Đại học Việt Nhật" text="Trường Đại học Việt Nhật, Đại học Quốc gia Hà Nội." />
            <ContactCard title="Cổng ClubHub" text="Quản lý câu lạc bộ, thông báo, tài liệu và hồ sơ thành viên." />
            <ContactCard title="Tiếp cận nhanh" text="Đăng nhập để vào dashboard. Khách có thể xem CLB công khai và tin tức." />
          </div>
        </div>
      </section>

      <footer className="border-t border-border/70 bg-[#cc3366] text-white dark:border-white/10 dark:bg-[#091222]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/65">TRƯỜNG ĐẠI HỌC VIỆT NHẬT</p>
            <p className="mt-1 text-sm text-white/85">ClubHub - cổng thông tin câu lạc bộ và hồ sơ thành viên.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/home" className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10">Home</Link>
            <Link href="/login" className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10">Đăng nhập</Link>
            <Link href="/register" className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10">Đăng kí</Link>
          </div>
        </div>
      </footer>

      <EntityDrawer
        open={!!selectedClub}
        onClose={() => setSelectedClub(null)}
        title={selectedClub?.name ?? "Chi tiết câu lạc bộ"}
        subtitle={selectedClub?.code}
        icon={<Building2 />}
        footer={selectedClub && (
          <>
            {isAuthenticated ? (
              <>
                <Button variant="outline" size="sm" onClick={() => router.push("/clubs")}><Compass size={14} /> Mở trang CLB</Button>
                <Button size="sm" onClick={() => router.push("/memberships")}><Users size={14} /> CLB đã tham gia</Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => router.push("/login")}><LogIn size={14} /> Đăng nhập</Button>
                <Button size="sm" onClick={() => router.push("/register")}><ArrowRight size={14} /> Đăng kí</Button>
              </>
            )}
          </>
        )}
      >
        {selectedClub && (
          <DetailList
            rows={[
              ["Mã CLB", <span key="code" className="font-mono font-semibold text-primary">{selectedClub.code}</span>],
              ["Trạng thái", <StatusBadge key="status" status={selectedClub.status} />],
              ["Lĩnh vực", selectedClub.activityField],
              ["Mô tả", <p key="desc" className="whitespace-pre-line text-muted-foreground">{selectedClub.description}</p>],
              ["Điểm nổi bật", <ul key="highlights" className="list-disc space-y-1 pl-5 text-muted-foreground">{selectedClub.highlights.map((item) => <li key={item}>{item}</li>)}</ul>],
              ["Mức truy cập", selectedClub.mode === "public" ? "Công khai" : "Theo phiên đăng nhập"],
              ["Liên hệ", selectedClub.contactEmail || "Chưa công bố"],
            ]}
          />
        )}
      </EntityDrawer>
    </main>
  );
}

function TopNavButton({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex h-10 items-center gap-2 rounded-full border border-border/70 bg-white px-4 text-sm font-semibold transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">{icon}{label}</button>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[1.75rem] border border-border/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-2 text-sm font-black text-primary">{icon}{title}</div>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p>
    </div>
  );
}

function QuickLink({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex items-center justify-between rounded-2xl border border-border/70 bg-background px-4 py-3 text-left text-sm font-semibold transition-colors hover:border-primary/30 hover:bg-primary/5 dark:border-white/10 dark:bg-white/5"><span>{label}</span><ChevronRight size={15} className="text-primary" /></button>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border/70 bg-background px-4 py-3 dark:border-white/10 dark:bg-white/5"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-1 text-xl font-black text-primary">{value}</p></div>;
}

function QuickTile({ title, value, onClick, disabled }: { title: string; value: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} className="rounded-[1.5rem] border border-border/70 bg-background p-4 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-black text-primary">{value}</p>
    </button>
  );
}

function ContactCard({ title, text }: { title: string; text: string }) {
  return <div className="rounded-[1.75rem] border border-border/70 bg-background p-5 dark:border-white/10 dark:bg-white/5"><p className="text-sm font-black text-primary">{title}</p><p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p></div>;
}

function ClubPreviewCard({ club, onOpen }: { club: ClubCard; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group flex h-full flex-col justify-between rounded-[1.75rem] border border-border/70 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 dark:border-white/10 dark:bg-white/5">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{club.code}</p>
            <h3 className="mt-1 text-lg font-black tracking-tight">{club.name}</h3>
          </div>
          <StatusBadge status={club.status} />
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{club.summary}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {club.highlights.slice(0, 3).map((item) => <Badge key={item}>{item}</Badge>)}
      </div>
      <div className="mt-5 flex items-center justify-between text-xs font-semibold text-primary">
        <span>{club.mode === "public" ? "Xem công khai" : "Xem trong hệ thống"}</span>
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}
