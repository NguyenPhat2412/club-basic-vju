"use client";

import { useState } from "react";
import { Trash2, UserCheck } from "lucide-react";
import { ClubPositionHolder, ClubPositionSlot } from "@/lib/api";
import { LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveMediaUrl } from "@/lib/media";
import { formatDay } from "@/lib/utils";

function HolderAvatar({ holder }: { holder: ClubPositionHolder }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = imgFailed ? null : resolveMediaUrl(holder.avatarUrl);
  const label = holder.fullName || holder.email || "?";
  const initials = label
    .replace(/\s*\([^)]*\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={label}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="size-9 shrink-0 rounded-full border border-border/70 object-cover"
      />
    );
  }
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/15">
      {initials || "?"}
    </span>
  );
}

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
  if (isPending) {
    return (
      <div className="px-4 pt-3 sm:px-6">
        <LoadingRows rows={2} />
      </div>
    );
  }

  if (isError) {
    return <p className="px-4 pt-3 text-xs text-destructive sm:px-6">{describeError(error)}</p>;
  }

  if (!slots.length) return null;

  return (
    <div className="grid gap-3 px-4 pt-3 sm:px-6 md:grid-cols-2">
      {slots.map((slot) => (
        <div
          key={slot.roleId}
          className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 shadow-2xs"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-xs font-extrabold uppercase tracking-wider text-primary">
                {slot.roleName}
              </span>
              <Badge tone="neutral" dot={false}>
                {slot.holders.length}/{slot.maxHolders}
              </Badge>
            </div>
            {canAssignPosition && (
              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => onAssignSlot(slot)}>
                <UserCheck size={13} />
                {slot.holders.length >= slot.maxHolders ? "Thay thế" : "Bổ nhiệm"}
              </Button>
            )}
          </div>

          {slot.holders.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              Chưa bổ nhiệm
            </p>
          ) : (
            <ul className="space-y-1.5">
              {slot.holders.map((holder) => (
                <li
                  key={holder.assignmentId}
                  className="flex items-center justify-between gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <HolderAvatar holder={holder} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">
                        {holder.fullName || holder.email}
                        {holder.studentCode ? ` (${holder.studentCode})` : ""}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {holder.email} · {formatDay(holder.grantedAt)}
                      </p>
                    </div>
                  </div>
                  {canRevokePosition && (
                    <button
                      type="button"
                      aria-label={`Miễn nhiệm ${holder.fullName || holder.email}`}
                      title="Miễn nhiệm chức danh"
                      onClick={() => {
                        if (confirm(`Miễn nhiệm ${holder.fullName || holder.email} khỏi chức danh ${slot.roleName}?`)) {
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
  );
}
