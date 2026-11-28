"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { SecurityEventItem } from "@/lib/api";
import { Badge, type Tone } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { formatAuditAction } from "@/utils/audit/audit-meta";

type EventFilter = "all" | "login" | "failed" | "attack" | "changes";

export function compactDevice(ua?: string | null): string {
  if (!ua) return "—";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : /curl\//i.test(ua)
            ? "curl"
            : "Other";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}

function eventTone(action: string): Tone {
  if (action === "USER_LOGIN_FAILED" || action === "SECURITY_RATE_LIMIT_BLOCKED") return "danger";
  if (action === "USER_SESSION_TERMINATED" || action === "USER_LOCKED") return "pending";
  if (action === "USER_LOGGED_IN") return "success";
  return "primary";
}

function matchesFilter(item: SecurityEventItem, filter: EventFilter): boolean {
  if (filter === "all") return true;
  if (filter === "login") return item.action === "USER_LOGGED_IN";
  if (filter === "failed") return item.action === "USER_LOGIN_FAILED";
  if (filter === "attack") return item.action === "SECURITY_RATE_LIMIT_BLOCKED";
  return (
    item.action !== "USER_LOGGED_IN" &&
    item.action !== "USER_LOGIN_FAILED" &&
    item.action !== "SECURITY_RATE_LIMIT_BLOCKED"
  );
}

export function SystemSecurityEventsTable({
  events,
  canViewAudit,
}: {
  events: SecurityEventItem[];
  canViewAudit: boolean;
}) {
  const [filter, setFilter] = useState<EventFilter>("all");
  const filteredEvents = useMemo(
    () => events.filter((e) => matchesFilter(e, filter)),
    [events, filter],
  );

  const filters: { id: EventFilter; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "login", label: "Đăng nhập" },
    { id: "failed", label: "Đăng nhập thất bại" },
    { id: "attack", label: "Chặn vượt ngưỡng" },
    { id: "changes", label: "Cài đặt & Phân quyền" },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <h4 className="mr-2 text-[11px] font-bold uppercase tracking-wider text-primary">
            Nhật ký đăng nhập & Bảo mật gần đây
          </h4>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                filter === f.id
                  ? "bg-primary text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {canViewAudit && (
          <Link
            href="/audit-logs"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Mở toàn bộ Nhật ký hệ thống
            <ExternalLink size={12} />
          </Link>
        )}
      </div>

      {filteredEvents.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-slate-500">
          Chưa có sự kiện nào phù hợp với bộ lọc trong khoảng thời gian đã chọn.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-[10.5px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Thời gian</th>
                <th className="px-3 py-2 font-semibold">Tài khoản</th>
                <th className="px-3 py-2 font-semibold">Sự kiện</th>
                <th className="px-3 py-2 font-semibold">Địa chỉ IP</th>
                <th className="px-3 py-2 font-semibold">Thiết bị</th>
                <th className="px-3 py-2 font-semibold">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/60">
                  <td
                    className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-600"
                    data-no-i18n="true"
                  >
                    {formatDateTime(ev.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-900" data-no-i18n="true">
                      {ev.actorName || ev.actorEmail || "Ẩn danh"}
                    </p>
                    {ev.actorName && ev.actorEmail && (
                      <p className="text-[11px] text-slate-500" data-no-i18n="true">
                        {ev.actorEmail}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={eventTone(ev.action)}>{formatAuditAction(ev.action)}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <code
                      data-no-i18n="true"
                      className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-800"
                    >
                      {ev.ipAddress || "—"}
                    </code>
                  </td>
                  <td className="px-3 py-2 text-slate-600" title={ev.userAgent ?? undefined}>
                    <span data-no-i18n="true">{compactDevice(ev.userAgent)}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-500" data-no-i18n="true">
                    {ev.summary || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
