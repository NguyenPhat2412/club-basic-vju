"use client";
import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Compass, Mail, Search, Send, Sparkles, Star } from "lucide-react";
import { apiModel, Club } from "@/lib/api";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

const LIMIT = 20;

export default function ClubsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Club | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  const clubs = useQuery({
    queryKey: ["clubs", search, offset],
    queryFn: () => apiModel.clubs(search, "", offset, LIMIT),
    placeholderData: keepPreviousData,
  });

  const apply = useMutation({
    mutationFn: () => apiModel.apply(selected!.id, message),
    onSuccess: () => {
      setNotice(`Đã gửi đơn đăng ký vào ${selected!.name}. Theo dõi tại "Đơn đăng ký của tôi".`);
      setMessage("");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });

  const filteredItems = useMemo(() => {
    const items = clubs.data?.items ?? [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((club) => [club.name, club.code, club.activityField, club.description, club.contactEmail].join(" ").toLowerCase().includes(q));
  }, [clubs.data?.items, search]);

  const open = (club: Club) => {
    setSelected(club);
    setMessage("");
    apply.reset();
  };

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(204,51,102,0.08),transparent_24%),linear-gradient(180deg,#fff,#fffafc)] px-4 py-8 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(217,75,124,0.10),transparent_24%),linear-gradient(180deg,#101114,#17181d)]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">CLB</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Khám phá câu lạc bộ</h1>
          </div>
          <div className="flex gap-2">
            <a href="/home" className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground">Home</a>
            <a href="/dashboard" className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground">Dashboard</a>
            <a href="/profile" className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Hồ sơ</a>
          </div>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-border bg-white shadow-sm dark:border-white/10 dark:bg-[#121418]">
          <div className="bg-[linear-gradient(135deg,rgba(204,51,102,0.96),rgba(166,32,79,0.95))] p-6 text-white sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/90">
                  <Sparkles size={12} /> Cổng thông tin CLB
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Một nơi để tìm và hiểu từng câu lạc bộ rõ ràng hơn.</h2>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">Tổng số</p>
                <p className="mt-1 text-2xl font-black">{clubs.data?.total ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-border/60 pb-4 lg:flex-row lg:items-center lg:justify-between dark:border-white/10">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Tìm nhanh</p>
                <p className="mt-2 text-sm text-muted-foreground">Tìm theo tên, mã CLB, lĩnh vực hoặc thông tin liên hệ.</p>
              </div>
              <div className="w-full max-w-xl">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm CLB..." className="h-11 rounded-full pl-9" />
                </div>
              </div>
            </div>

            {notice && (
              <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                {notice}
              </div>
            )}

            {clubs.isPending ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-52 animate-pulse rounded-[1.75rem] border border-border bg-background dark:border-white/10 dark:bg-white/5" />
                ))}
              </div>
            ) : clubs.isError ? (
              <div className="mt-6 rounded-[1.75rem] border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
                {describeError(clubs.error)}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="mt-6 rounded-[1.75rem] border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5">
                Không tìm thấy CLB phù hợp với từ khoá hiện tại.
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((club) => (
                  <article key={club.id} className="group rounded-[1.75rem] border border-border bg-background p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-lg font-black text-primary">{club.name.slice(0, 1)}</span>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{club.code}</p>
                          <h3 className="mt-1 text-lg font-black tracking-tight">{club.name}</h3>
                        </div>
                      </div>
                      <StatusBadge status={club.status} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {club.activityField && <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{club.activityField}</span>}
                      {club.contactEmail && <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Liên hệ</span>}
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-7 text-muted-foreground">
                      {club.description || "CLB đang cập nhật mô tả hoạt động."}
                    </p>

                    <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm text-muted-foreground dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-primary" />
                        <span>{club.activityField || "Lĩnh vực chung"}</span>
                      </div>
                      {club.contactEmail && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-primary" />
                          <span className="truncate">{club.contactEmail}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex gap-2">
                      <Button variant="outline" className="flex-1 rounded-full" onClick={() => open(club)}>Chi tiết</Button>
                      <Button className="flex-1 rounded-full" onClick={() => open(club)} disabled={club.status !== "ACTIVE"}>Gửi đơn</Button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {clubs.data && (
              <div className="mt-6 flex items-center justify-between gap-3 rounded-[1.5rem] border border-border bg-background p-3 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5">
                <span>Hiển thị {Math.min(filteredItems.length, clubs.data.total)} / {clubs.data.total} CLB</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => setOffset((prev) => Math.max(0, prev - LIMIT))} disabled={offset === 0}>Trước</Button>
                  <Button size="sm" className="rounded-full" onClick={() => setOffset((prev) => prev + LIMIT)} disabled={offset + LIMIT >= clubs.data.total}>Sau</Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <EntityDrawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ""} subtitle={selected?.code} icon={<Compass />}>
        {selected && (
          <>
            <DetailList rows={[
              ["Mã CLB", <span key="code" className="font-mono font-semibold text-primary">{selected.code}</span>],
              ["Trạng thái", <StatusBadge key="status" status={selected.status} />],
              ["Lĩnh vực", selected.activityField || "—"],
              ["Liên hệ", selected.contactEmail ? <a key="mail" className="inline-flex items-center gap-1 text-primary hover:underline" href={`mailto:${selected.contactEmail}`}><Mail size={13} /> {selected.contactEmail}</a> : "—"],
              ["Giới thiệu", <p key="desc" className="whitespace-pre-line text-muted-foreground">{selected.description || "CLB đang cập nhật giới thiệu."}</p>],
            ]} />

            <Section title="Gửi đơn đăng ký" icon={<Send />}>
              {selected.status !== "ACTIVE" ? (
                <p className="text-sm text-muted-foreground">CLB hiện đang tạm ngừng nhận thành viên.</p>
              ) : (
                <>
                  <Textarea maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Chia sẻ lý do bạn muốn tham gia…" aria-label="Lời nhắn" />
                  {apply.error && <p className="text-xs text-destructive">{describeError(apply.error)}</p>}
                  <Button className="justify-self-end text-xs font-bold" disabled={!message.trim() || apply.isPending} onClick={() => apply.mutate()}>
                    <Send size={14} /> {apply.isPending ? "Đang gửi…" : "Gửi đơn"}
                  </Button>
                </>
              )}
            </Section>
          </>
        )}
      </EntityDrawer>
    </main>
  );
}
