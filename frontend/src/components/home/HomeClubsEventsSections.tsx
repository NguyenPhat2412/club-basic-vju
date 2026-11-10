"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { ClubAvatar, ClubCoverBanner } from "@/components/shared/ClubMedia";
import { describeError } from "@/components/shared/ListPage";
import { keepWords } from "@/lib/utils";
import { ClubItem, EventItem } from "@/types";

function formatShortDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

interface HomeClubsEventsSectionsProps {
  allClubs: ClubItem[];
  featuredClubs: ClubItem[];
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  totalClubs?: number;
  clubsPending: boolean;
  clubsError: unknown;
  featuredEvents: EventItem[];
  eventsPending: boolean;
}

export function HomeClubsEventsSections({
  allClubs,
  featuredClubs,
  categories,
  selectedCategory,
  setSelectedCategory,
  totalClubs,
  clubsPending,
  clubsError,
  featuredEvents,
  eventsPending,
}: HomeClubsEventsSectionsProps) {
  return (
    <>
      <section className="mx-auto max-w-[1380px] px-5 py-12 sm:px-8 sm:py-20 lg:px-12" id="cau-lac-bo">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">HỆ SINH THÁI CÂU LẠC BỘ VJU</p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-slate-900 sm:text-4xl">
              {keepWords("Tìm nơi bạn thuộc về.")}
            </h2>
          </div>
          <Link href="/clubs" className="inline-flex items-center gap-2 pb-1 text-sm font-bold text-primary hover:underline">
            <span>{totalClubs !== undefined ? `XEM TẤT CẢ CÂU LẠC BỘ (${totalClubs})` : "XEM TẤT CẢ CÂU LẠC BỘ"}</span>
            <ArrowRight size={15} />
          </Link>
        </div>
        <p className="mt-3 max-w-[660px] text-sm leading-6 text-slate-700 sm:text-[15px] sm:leading-7">
          {keepWords("Chọn câu lạc bộ phù hợp để xem hình ảnh hoạt động thực tế, cơ cấu ban chuyên môn và nộp đơn ứng tuyển trực tuyến.")}
        </p>

        {categories.length > 0 && (
          <div className="-mx-5 mt-5 flex items-center gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:mt-6 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCategory("")}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-colors sm:text-[13px] ${
                selectedCategory === ""
                  ? "bg-primary text-white shadow-2xs"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:text-primary"
              }`}
            >
              {`Tất cả (${allClubs.length})`}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-colors sm:text-[13px] ${
                  selectedCategory === cat
                    ? "bg-primary text-white shadow-2xs"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:text-primary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {clubsPending ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : clubsError ? (
          <div className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            Không thể tải danh sách câu lạc bộ: {describeError(clubsError)}
          </div>
        ) : featuredClubs.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
            Hiện chưa có câu lạc bộ nào đang hoạt động trên hệ thống.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredClubs.map((club, index) => (
              <Link
                href={`/clubs?clubId=${club.id}`}
                key={club.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
              >
                <div>
                  <ClubCoverBanner
                    name={club.name}
                    code={club.code}
                    coverUrl={club.coverUrl}
                    className="h-44 w-full"
                  >
                    <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5">
                      <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary shadow-xs">
                        {club.activityField || "CLB Sinh viên"}
                      </span>
                    </div>
                    <span className="absolute right-3.5 top-3 rounded-md bg-slate-950/55 px-2 py-0.5 font-mono text-sm font-extrabold text-white backdrop-blur-2xs">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </ClubCoverBanner>

                  <div className="px-5 pb-4 pt-4">
                    <div className="flex items-start gap-3">
                      <ClubAvatar name={club.name} code={club.code} logoUrl={club.logoUrl} size="md" className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                          {club.code}
                        </p>
                        <h3 className="mt-0.5 line-clamp-2 text-[17px] font-bold leading-snug text-slate-900 group-hover:text-primary">
                          {club.name}
                        </h3>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700">
                      {club.description || "Khám phá hoạt động và cơ hội đồng hành cùng câu lạc bộ tại VJU."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 text-sm font-bold text-primary">
                  <span>Xem hoạt động & nộp đơn</span>
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section id="hoat-dong" className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.86fr_1.14fr] lg:items-center lg:px-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">ĐỜI SỐNG SINH VIÊN VJU</p>
            <h2 className="mt-2 max-w-lg text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              {keepWords("Ngoài lớp học, còn cả một thế giới.")}
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-slate-700">
              {keepWords("Từ giảng đường Hòa Lạc đến những lễ hội giao lưu văn hóa Việt - Nhật, hội thảo nghiên cứu và các giải đấu thể thao, mỗi câu lạc bộ là một mảnh ghép làm nên thanh xuân rực rỡ của sinh viên VJU.")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/clubs"
                className="inline-flex h-11 items-center gap-2.5 rounded-lg bg-primary px-5 text-sm font-bold text-white hover:opacity-90"
              >
                KHÁM PHÁ 12+ CÂU LẠC BỘ <ArrowRight size={15} />
              </Link>
              <Link
                href="/events"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-800 hover:border-primary/40 hover:text-primary"
              >
                XEM LỊCH SỰ KIỆN MỞ
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xs sm:col-span-2">
              <div
                className="h-48 w-full bg-cover bg-center sm:h-68"
                style={{ backgroundImage: "url('/images/clubs/vjua/gallery-2.jpg')" }}
              />
              <div className="flex items-center justify-between bg-white px-4 py-3.5 sm:px-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    {keepWords("HOẠT ĐỘNG CÂU LẠC BỘ SINH VIÊN VJU")}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 sm:text-[15px]">
                    {keepWords("Nơi hội tụ đam mê của 12+ câu lạc bộ tại Trường Đại học Việt Nhật")}
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div
                className="h-36 w-full bg-cover bg-center"
                style={{ backgroundImage: "url('/images/clubs/monozukuri/gallery-2.jpg')" }}
              />
              <div className="p-4">
                <p className="text-sm font-bold text-slate-900">Học thuật & Chế tạo CLB</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-600">Nghiên cứu khoa học, lập trình & sáng tạo Monozukuri</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div
                className="h-36 w-full bg-cover bg-center"
                style={{ backgroundImage: "url('/images/clubs/ouvevju/cover.jpg')" }}
              />
              <div className="p-4">
                <p className="text-sm font-bold text-slate-900">Văn hóa, Sự kiện & Thể thao</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-600">Giao lưu văn hóa Việt - Nhật, truyền thông & thể thao CLB</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="tin-tuc" className="mx-auto max-w-[1380px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">BẢNG TIN HOẠT ĐỘNG</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-4xl">{keepWords("Sự kiện câu lạc bộ sắp diễn ra")}</h2>
          </div>
          <Link href="/events" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
            XEM TẤT CẢ SỰ KIỆN <ArrowRight size={15} />
          </Link>
        </div>

        {eventsPending ? (
          <div className="mt-7 space-y-2.5">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-14 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : featuredEvents.length === 0 ? (
          <div className="mt-7 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
            Hiện chưa có sự kiện công khai nào đang mở đăng ký.
          </div>
        ) : (
          <div className="mt-7 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            {featuredEvents.map((ev) => (
              <Link
                href="/events"
                key={ev.id}
                className="group grid gap-2 p-4 transition-colors hover:bg-slate-50 sm:px-6 lg:grid-cols-[115px_210px_1fr_auto] lg:items-center lg:gap-5"
              >
                <div className="flex flex-wrap items-center gap-2 lg:contents">
                  <span className="font-mono text-xs font-bold text-slate-700 sm:text-sm">{formatShortDate(ev.startTime)}</span>
                  <span className="text-slate-300 lg:hidden">·</span>
                  <span className="truncate text-xs font-bold uppercase tracking-wider text-primary">
                    {ev.clubName}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[15px] font-bold text-slate-900 group-hover:text-primary lg:truncate">{ev.title}</p>
                  {ev.location && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-600 sm:text-sm">
                      <MapPin size={13} className="shrink-0 text-primary" /> {ev.location}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  {ev.allowCtv && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                      Tuyển CTV
                    </span>
                  )}
                  <ArrowRight size={16} className="ml-auto text-primary transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
