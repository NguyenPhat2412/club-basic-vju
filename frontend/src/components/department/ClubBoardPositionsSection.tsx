"use client";

import { Crown, Trash2, UserCheck } from "lucide-react";
import { ClubPositionSlot } from "@/lib/api";
import { LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/utils";

export function ClubBoardPositionsSection({
  slots,
  isPending,
  isError,
  error,
  canAssignPosition,
  canRevokePosition,
  onAssignSlot,
  onRevokeAssignment,
}: {
  slots: ClubPositionSlot[];
  isPending: boolean;
  isError: boolean;
  error: unknown;
  canAssignPosition: boolean;
  canRevokePosition: boolean;
  onAssignSlot: (slot: ClubPositionSlot) => void;
  onRevokeAssignment: (assignmentId: string) => void;
}) {
  return (
    <section className="mx-4 mt-3 rounded-xl border border-border bg-card p-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Crown size={16} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Cơ cấu Ban Chủ nhiệm CLB & Chức danh tổ chức (PB-14.1, PB-14.2)
            </h3>
            <p className="text-xs text-muted-foreground">
              Người giữ chức danh phải là thành viên đang hoạt động của CLB/Ban. Tự động kiểm tra số lượng tối đa và thay thế người đương nhiệm.
            </p>
          </div>
        </div>
      </div>

      {isPending ? (
        <LoadingRows rows={2} />
      ) : isError ? (
        <p className="mt-3 text-xs text-destructive">{describeError(error)}</p>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {slots.map((slot) => (
            <div
              key={slot.roleId}
              className="flex flex-col justify-between rounded-lg border border-border/70 bg-muted/20 p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                      {slot.roleName}
                    </span>
                    <Badge tone="neutral">
                      {slot.holders.length}/{slot.maxHolders} vị trí
                    </Badge>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{slot.roleCode}</p>
                </div>
                {canAssignPosition && (
                  <Button size="sm" variant="outline" onClick={() => onAssignSlot(slot)}>
                    <UserCheck size={13} />
                    {slot.holders.length >= slot.maxHolders ? "Thay thế" : "Bổ nhiệm"}
                  </Button>
                )}
              </div>

              {slot.holders.length === 0 ? (
                <p className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  Chưa có thành viên nào giữ chức danh này.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {slot.holders.map((holder) => (
                    <li
                      key={holder.assignmentId}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">
                          {holder.fullName || holder.email}
                          {holder.studentCode ? ` (${holder.studentCode})` : ""}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {holder.email} · bổ nhiệm {formatDay(holder.grantedAt)}
                        </p>
                      </div>
                      {canRevokePosition && (
                        <button
                          type="button"
                          aria-label={`Miễn nhiệm ${holder.fullName || holder.email}`}
                          title="Miễn nhiệm chức danh"
                          onClick={() => {
                            if (
                              confirm(`Miễn nhiệm ${holder.fullName || holder.email} khỏi chức danh ${slot.roleName}?`)
                            ) {
                              onRevokeAssignment(holder.assignmentId);
                            }
                          }}
                          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
