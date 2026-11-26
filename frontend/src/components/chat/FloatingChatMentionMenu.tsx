"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AtSign, Loader2 } from "lucide-react";
import { clubsApi } from "@/api/club/clubs.api";
import { qk } from "@/lib/api/query-keys";
import { UserAvatar } from "@/components/user/UserAvatar";
import { cn } from "@/lib/utils";
import type { Membership } from "@/types/club/club.types";

export type ActiveMentionSpan = {
  query: string;
  start: number;
  end: number;
};

export function extractActiveMention(value: string, cursor: number): ActiveMentionSpan | null {
  if (!value || cursor < 0) return null;
  const safeCursor = Math.min(cursor, value.length);
  const before = value.slice(0, safeCursor);
  const atIndex = before.lastIndexOf("@");
  if (atIndex === -1) return null;
  if (atIndex > 0 && !/\s/.test(before[atIndex - 1]!)) return null;
  const query = before.slice(atIndex + 1);
  if (query.includes("\n") || query.length > 40) return null;
  if ((query.match(/\s/g) ?? []).length > 2) return null;
  return { query, start: atIndex, end: safeCursor };
}

export function applyMentionReplacement(
  value: string,
  span: ActiveMentionSpan,
  displayName: string,
  maxLength = 4000,
): { nextValue: string; nextCursor: number } {
  const inserted = `@${displayName.trim()} `;
  const prefix = value.slice(0, span.start);
  const suffix = value.slice(span.end);
  const nextValue = `${prefix}${inserted}${suffix}`.slice(0, maxLength);
  const nextCursor = Math.min(prefix.length + inserted.length, nextValue.length);
  return { nextValue, nextCursor };
}

export function useClubMentionCandidates(clubId: string, query: string, enabled: boolean) {
  const membersQuery = useQuery({
    queryKey: qk.clubMembers(clubId, "mention"),
    queryFn: () => clubsApi.clubMemberships(clubId, "ACTIVE", 0, 100),
    enabled: enabled && Boolean(clubId),
    staleTime: 60_000,
    retry: false,
  });

  const candidates = useMemo<Membership[]>(() => {
    const items = membersQuery.data?.items ?? [];
    const seen = new Set<string>();
    const normalized = query.trim().toLowerCase();
    const out: Membership[] = [];
    for (const m of items) {
      const name = m.userFullName?.trim();
      if (!name || seen.has(m.userId)) continue;
      seen.add(m.userId);
      if (
        !normalized ||
        name.toLowerCase().includes(normalized) ||
        (m.userStudentCode ?? "").toLowerCase().includes(normalized)
      ) {
        out.push(m);
        if (out.length >= 6) break;
      }
    }
    return out;
  }, [membersQuery.data?.items, query]);

  return { candidates, isPending: membersQuery.isPending };
}

export function FloatingChatMentionMenu({
  open,
  candidates,
  isPending,
  activeIndex,
  onHoverIndex,
  onSelect,
}: {
  open: boolean;
  candidates: Membership[];
  isPending: boolean;
  activeIndex: number;
  onHoverIndex: (idx: number) => void;
  onSelect: (member: Membership) => void;
}) {
  if (!open || (!isPending && candidates.length === 0)) return null;

  return (
    <div
      role="listbox"
      aria-label="Gợi ý nhắc tên thành viên"
      className="fade-in absolute inset-x-2 bottom-full z-40 mb-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-500">
        <span className="inline-flex items-center gap-1 text-primary">
          <AtSign size={11} /> Nhắc tên thành viên CLB
        </span>
        <span className="text-[10px] font-medium text-slate-400">Enter / Tab</span>
      </div>
      {isPending ? (
        <div className="flex items-center justify-center gap-1.5 py-3 text-[11px] text-slate-500">
          <Loader2 size={12} className="animate-spin text-primary" /> Đang tải danh sách thành viên…
        </div>
      ) : (
        <ul className="max-h-44 overflow-y-auto p-1">
          {candidates.map((member, idx) => {
            const name = member.userFullName?.trim() || "Thành viên";
            const active = idx === activeIndex;
            return (
              <li key={member.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(member);
                  }}
                  onMouseEnter={() => onHoverIndex(idx)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                    active ? "bg-primary/10 text-primary" : "text-slate-800 hover:bg-slate-100",
                  )}
                >
                  <UserAvatar
                    avatarUrl={member.userAvatarUrl}
                    name={name}
                    size="xs"
                    rounded="full"
                  />
                  <div className="min-w-0 flex-1">
                    <p data-no-i18n="true" className="truncate font-semibold leading-tight">
                      {name}
                    </p>
                    {member.userStudentCode && (
                      <p data-no-i18n="true" className="truncate font-mono text-[10px] text-slate-400">
                        {member.userStudentCode}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
