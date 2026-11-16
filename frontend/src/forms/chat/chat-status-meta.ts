import { formatDateTime } from "@/lib/utils";
import type { ChatMessage, ChatMessageDeliveryStatus } from "@/types/chat/chat.types";

export type ResolvedChatStatusMeta = {
  status: ChatMessageDeliveryStatus;
  shortLabel: string;
  detailLabel: string;
  tooltip: string;
};

const RECEIPT_RANK: Record<ChatMessageDeliveryStatus, number> = {
  failed: 0,
  uploading: 1,
  sending: 2,
  sent: 3,
  delivered: 4,
  seen: 5,
};

export function mergeConfirmedDeliveryReceipt(prev: ChatMessage, incoming: ChatMessage): ChatMessage {
  const prevStatus = normalizeMessageDeliveryStatus(prev);
  const nextStatus = normalizeMessageDeliveryStatus(incoming);
  if (!prev.optimistic && RECEIPT_RANK[prevStatus] > RECEIPT_RANK[nextStatus]) {
    return {
      ...prev,
      ...incoming,
      deliveryStatus: prevStatus,
      deliveredAt: incoming.deliveredAt ?? prev.deliveredAt,
      seenCount: Math.max(prev.seenCount ?? 0, incoming.seenCount ?? 0),
      seenByNames: (incoming.seenByNames?.length ? incoming.seenByNames : prev.seenByNames) ?? [],
      lastSeenAt: incoming.lastSeenAt ?? prev.lastSeenAt,
    };
  }
  return { ...prev, ...incoming };
}

export function normalizeMessageDeliveryStatus(m: ChatMessage): ChatMessageDeliveryStatus {
  const raw = m.deliveryStatus?.toLowerCase();
  if (raw === "failed") return "failed";
  if (raw === "uploading") return "uploading";
  if (raw === "sending" || m.optimistic) return "sending";
  if (raw === "seen" || (m.seenCount ?? 0) > 0) return "seen";
  if (raw === "delivered" || Boolean(m.deliveredAt)) return "delivered";
  return "sent";
}

export function resolveChatMessageStatusMeta(m: ChatMessage): ResolvedChatStatusMeta {
  const status = normalizeMessageDeliveryStatus(m);
  const createdText = formatDateTime(m.createdAt);

  if (status === "uploading") {
    return {
      status,
      shortLabel: "Đang tải tệp…",
      detailLabel: "Đang tải tệp…",
      tooltip: "Đang tải tệp đính kèm lên máy chủ…",
    };
  }
  if (status === "sending") {
    return {
      status,
      shortLabel: "Đang gửi…",
      detailLabel: "Đang gửi…",
      tooltip: "Tin nhắn đang được gửi lên máy chủ…",
    };
  }
  if (status === "failed") {
    const err = m.deliveryError?.trim() || "Không thể kết nối tới máy chủ";
    return {
      status,
      shortLabel: "Gửi lỗi",
      detailLabel: `Gửi lỗi: ${err}`,
      tooltip: err,
    };
  }
  if (status === "seen") {
    const count = Math.max(1, m.seenCount ?? m.seenByNames?.length ?? 1);
    const names = (m.seenByNames ?? []).filter(Boolean);
    const detailLabel =
      count === 1 && names[0]
        ? `Đã xem · ${names[0]}`
        : count > 1
          ? `Đã xem (${count})`
          : "Đã xem";
    const readersSummary = names.length
      ? `${names.join(", ")}${count > names.length ? ` và ${count - names.length} người khác` : ""}`
      : `${count} thành viên`;
    const seenWhen = m.lastSeenAt ? ` lúc ${formatDateTime(m.lastSeenAt)}` : "";
    return {
      status,
      shortLabel: "Đã xem",
      detailLabel,
      tooltip: `Đã xem bởi ${readersSummary}${seenWhen}`,
    };
  }
  if (status === "delivered") {
    const deliveredWhen = m.deliveredAt ? formatDateTime(m.deliveredAt) : createdText;
    return {
      status,
      shortLabel: "Đã nhận",
      detailLabel: "Đã nhận",
      tooltip: `Đã nhận lúc ${deliveredWhen}`,
    };
  }
  return {
    status: "sent",
    shortLabel: "Đã gửi",
    detailLabel: "Đã gửi",
    tooltip: `Đã gửi lên máy chủ lúc ${createdText}`,
  };
}

export function applyChannelDeliveredReceipt(
  items: ChatMessage[],
  viewerId: string | undefined,
  currentUserId: string | undefined,
  occurredAt: string
): ChatMessage[] {
  if (!currentUserId || (viewerId && viewerId === currentUserId)) return items;
  let changed = false;
  const next = items.map((m) => {
    if (m.optimistic || m.senderId !== currentUserId) return m;
    const cur = normalizeMessageDeliveryStatus(m);
    if (cur !== "sent") return m;
    changed = true;
    return {
      ...m,
      deliveryStatus: "delivered" as const,
      deliveredAt: m.deliveredAt ?? occurredAt,
    };
  });
  return changed ? next : items;
}

export function applyChannelReadReceipt(
  items: ChatMessage[],
  readerId: string | undefined,
  readerName: string | undefined,
  currentUserId: string | undefined,
  readAt: string
): ChatMessage[] {
  if (!currentUserId || (readerId && readerId === currentUserId)) return items;
  const readMs = Date.parse(readAt);
  if (Number.isNaN(readMs)) return items;
  const cleanReader = readerName?.trim();

  let changed = false;
  const next = items.map((m) => {
    if (m.optimistic || m.senderId !== currentUserId) return m;
    const createdMs = Date.parse(m.createdAt);
    if (!Number.isNaN(createdMs) && createdMs > readMs) return m;

    const existingNames = (m.seenByNames ?? []).filter(Boolean);
    const alreadyNamed = Boolean(cleanReader && existingNames.includes(cleanReader));
    const nextNames =
      cleanReader && !alreadyNamed ? [cleanReader, ...existingNames].slice(0, 4) : existingNames;
    const nextCount = alreadyNamed
      ? Math.max(1, m.seenCount ?? existingNames.length)
      : (m.seenCount ?? existingNames.length) + 1;

    if (normalizeMessageDeliveryStatus(m) === "seen" && alreadyNamed) return m;
    changed = true;
    return {
      ...m,
      deliveryStatus: "seen" as const,
      deliveredAt: m.deliveredAt ?? readAt,
      seenCount: nextCount,
      seenByNames: nextNames,
      lastSeenAt: readAt,
    };
  });
  return changed ? next : items;
}
