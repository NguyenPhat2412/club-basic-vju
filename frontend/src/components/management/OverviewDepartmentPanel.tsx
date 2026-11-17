"use client";

import { Building2 } from "lucide-react";
import type { ClubDepartmentStatsItem } from "@/types/statistics/statistics.types";
import { StatusBadge } from "@/components/ui/badge";

export function OverviewDepartmentPanel({
  departments,
  totalActiveMembers,
}: {
  departments: ClubDepartmentStatsItem[];
  totalActiveMembers: number;
}) {
  if (!departments || departments.length === 0) {
    return null;
  }

  const denom = Math.max(totalActiveMembers, 1);

  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Building2 size={15} />
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Thống kê chi tiết theo từng Ban chuyên môn ({departments.length})
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Đối chiếu nhân sự ACTIVE hiện tại với sức hút ứng tuyển (Nguyện vọng 1 / 2) và khối lượng công việc từng ban
            </p>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet (< md): Responsive Card Grid */}
      <div className="mt-3 grid gap-2.5 md:hidden">
        {departments.map((dept) => {
          const sharePct = Math.min(100, Math.round((dept.activeMembers * 100) / denom));
          return (
            <div
              key={dept.departmentId}
              className="rounded-lg border border-border/75 bg-background/60 p-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-foreground">{dept.departmentName}</p>
                <StatusBadge status={dept.status} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Nhân sự: </span>
                  <span className="font-mono font-bold text-foreground">
                    {dept.activeMembers} ({sharePct}%)
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">NV1 / NV2: </span>
                  <span className="font-mono font-bold text-primary">
                    {dept.firstChoiceApplications}/{dept.secondChoiceApplications}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Việc Mở/Xong: </span>
                  <span className="font-mono font-bold text-slate-900">
                    {dept.openTasks}/{dept.completedTasks}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop (>= md): Crisp Structured Table */}
      <div className="mt-3 hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border/70 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-3">Ban chuyên môn</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="px-3 py-2">Thành viên ACTIVE</th>
              <th className="px-3 py-2 text-right">Ứng tuyển NV1</th>
              <th className="px-3 py-2 text-right">Ứng tuyển NV2</th>
              <th className="px-3 py-2 text-right">Việc đang mở</th>
              <th className="py-2 pl-3 text-right">Đã nghiệm thu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {departments.map((dept) => {
              const sharePct = Math.min(100, Math.round((dept.activeMembers * 100) / denom));
              return (
                <tr key={dept.departmentId} className="hover:bg-muted/30">
                  <td className="py-2.5 pr-3 font-semibold text-foreground">{dept.departmentName}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={dept.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 font-mono font-bold tabular-nums text-foreground">
                        {dept.activeMembers}
                      </span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${sharePct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">{sharePct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-primary">
                    {dept.firstChoiceApplications}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                    {dept.secondChoiceApplications}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-700">
                    {dept.openTasks}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono font-bold tabular-nums text-slate-900">
                    {dept.completedTasks}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
