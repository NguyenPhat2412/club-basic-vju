"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { ArrowUpRight, Compass, UsersRound } from "lucide-react";
import { apiModel, describeError } from "@/lib/api";
import { clubSlugFromCode } from "@/lib/media";
import { cn, formatDay } from "@/lib/utils";
import { ClubAvatar, useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ProfileMembershipsCard() {
  const router = useRouter();
  const mediaCatalog = useClubMediaCatalog(true);

  const memberships = useQuery({
    queryKey: qk.myMemberships("profile"),
    queryFn: () => apiModel.myMemberships({ limit: 50 }),
  });

  const activeItems = useMemo(
    () => (memberships.data?.items ?? []).filter((m) => m.status !== "LEFT"),
    [memberships.data?.items],
  );

  const hasPastHistory = (memberships.data?.items.length ?? 0) > activeItems.length;

  return (
    <section className="@container min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5 @4xl:p-6">
      <div className="flex flex-col gap-3 border-b border-border pb-4 @sm:flex-row @sm:items-center @sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-primary/5 text-primary">
            <UsersRound size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">HOẠT ĐỘNG CÂU LẠC BỘ</p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="truncate text-lg font-bold tracking-tight sm:text-xl">Câu lạc bộ của tôi</h2>
              {!memberships.isPending && !memberships.isError && <CountBadge>{activeItems.length}</CountBadge>}
            </div>
          </div>
        </div>
        {(activeItems.length > 0 || hasPastHistory) && (
          <Button
            variant="outline"
            size="sm"
            className="w-full shrink-0 @sm:w-auto"
            onClick={() => router.push("/memberships")}
          >
            Quản lý CLB của tôi
            <ArrowUpRight size={14} />
          </Button>
        )}
      </div>

      <div className="mt-4">
        {memberships.isPending ? (
          <LoadingRows rows={2} />
        ) : memberships.isError ? (
          <ErrorState message={describeError(memberships.error)} onRetry={() => memberships.refetch()} />
        ) : activeItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center">
            <span className="grid size-12 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Compass size={22} />
            </span>
            <div className="max-w-sm">
              <p className="text-sm font-bold text-foreground">Bạn chưa tham gia câu lạc bộ nào</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Khám phá các câu lạc bộ sinh viên tại VJU để nộp đơn ứng tuyển và kết nối hoạt động ngoại khoá.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" onClick={() => router.push("/clubs")}>
                <Compass size={14} />
                Khám phá câu lạc bộ
              </Button>
              {hasPastHistory && (
                <Button variant="outline" size="sm" onClick={() => router.push("/memberships")}>
                  Quản lý CLB của tôi
                </Button>
              )}
            </div>
          </div>
        ) : (
          <ul
            className={cn(
              "flex flex-col gap-2.5",
              activeItems.length > 5 && "max-h-[430px] overflow-y-auto pr-1",
            )}
          >
            {activeItems.map((m) => {
              const media = mediaCatalog.data?.clubs[clubSlugFromCode(m.clubCode)];
              const deptText = m.departments.length
                ? `Ban: ${m.departments.map((d) => d.name).join(", ")}`
                : "Chưa thuộc ban nào";

              return (
                <li key={m.id} className="min-w-0">
                  <Link
                    href={`/clubs?clubId=${m.clubId}`}
                    className="group flex min-w-0 items-start justify-between gap-2.5 overflow-hidden rounded-xl border border-border/70 bg-muted/15 p-3 transition-colors hover:border-primary/35 hover:bg-muted/35"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <ClubAvatar
                        name={m.clubName}
                        code={m.clubCode}
                        fallbackUrl={media?.logo}
                        size="md"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="min-w-0 truncate text-sm font-bold text-foreground group-hover:text-primary">
                            {m.clubName}
                          </span>
                          <Badge tone="primary" dot={false} className="shrink-0">
                            {m.clubCode}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{deptText}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
                          <span>
                            Tham gia <span className="font-mono font-semibold text-foreground">{formatDay(m.joinedAt)}</span>
                          </span>
                          <span className="@md:hidden">
                            <StatusBadge status={m.status} />
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden shrink-0 pt-0.5 @md:block">
                      <StatusBadge status={m.status} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
