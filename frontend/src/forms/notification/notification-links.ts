import type { Tone } from "@/components/ui/badge";
import type { Notification } from "@/types/notification/notification.types";

export type NotificationGroupKey = "club" | "ops" | "chat" | "sys";

export function notificationReferenceMeta(refType?: string | null): {
  label: string;
  tone: Tone;
  group: NotificationGroupKey;
} {
  switch (refType) {
    case "CHAT":
      return { label: "Tin nhắn CLB", tone: "primary", group: "chat" };
    case "CLUB_APPLICATION_REVIEW":
      return { label: "Duyệt đơn mới", tone: "pending", group: "club" };
    case "CLUB_APPLICATION":
    case "APPLICATION":
      return { label: "Đơn ứng tuyển", tone: "primary", group: "club" };
    case "CLUB":
      return { label: "Câu lạc bộ", tone: "primary", group: "club" };
    case "MEMBERSHIP":
      return { label: "Thành viên", tone: "neutral", group: "club" };
    case "DEPARTMENT":
      return { label: "Ban chuyên môn", tone: "neutral", group: "club" };
    case "DOCUMENT":
      return { label: "Kho tài liệu", tone: "neutral", group: "ops" };
    case "EVENT":
      return { label: "Sự kiện", tone: "pending", group: "ops" };
    case "TASK":
      return { label: "Công việc", tone: "pending", group: "ops" };
    default:
      return { label: "Hệ thống", tone: "neutral", group: "sys" };
  }
}

export function targetHrefForNotification(n: Notification): { href: string; label: string } | null {
  if (n.referenceType === "CHAT") {
    const params = new URLSearchParams({ tab: "chat" });
    if (n.clubId) params.set("clubId", n.clubId);
    if (n.referenceId) params.set("channelId", n.referenceId);
    return { href: `/management?${params.toString()}`, label: "Mở kênh thảo luận" };
  }
  if (n.referenceType === "CLUB_APPLICATION_REVIEW") {
    const params = new URLSearchParams({ tab: "applications" });
    if (n.referenceId) params.set("clubId", n.referenceId);
    return { href: `/management?${params.toString()}`, label: "Duyệt đơn ứng tuyển" };
  }
  if (n.referenceType === "CLUB_APPLICATION" || n.referenceType === "APPLICATION") {
    return {
      href: n.referenceId ? `/applications?applicationId=${n.referenceId}` : "/applications",
      label: "Xem đơn đăng ký",
    };
  }
  if (n.referenceType === "DOCUMENT") {
    const params = new URLSearchParams({ tier: "club" });
    if (n.referenceId) params.set("clubId", n.referenceId);
    return { href: `/documents?${params.toString()}`, label: "Mở kho tài liệu" };
  }
  if (n.referenceType === "CLUB") {
    return { href: n.referenceId ? `/clubs?clubId=${n.referenceId}` : "/clubs", label: "Xem câu lạc bộ" };
  }
  if (n.referenceType === "EVENT") {
    return { href: "/events", label: "Xem sự kiện & đăng ký" };
  }
  if (n.referenceType === "TASK") {
    return { href: "/schedule", label: "Xem công việc & tiến độ" };
  }
  if (n.referenceType === "MEMBERSHIP") {
    return { href: "/memberships", label: "Xem tư cách thành viên" };
  }
  if (n.referenceType === "DEPARTMENT") {
    const params = new URLSearchParams({ tab: "departments" });
    if (n.referenceId) params.set("clubId", n.referenceId);
    return { href: `/management?${params.toString()}`, label: "Xem ban chuyên môn" };
  }
  return null;
}
