"use client";

import { useState, useSyncExternalStore } from "react";
import { BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  BrowserNotificationStatus,
  getBrowserNotificationStatus,
  requestAndEnableBrowserNotifications,
  setBrowserNotificationsPaused,
} from "@/lib/realtime/browser-notifications";

const emptySubscribe = () => () => {};

export function BrowserNotificationToggle() {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [override, setOverride] = useState<BrowserNotificationStatus | null>(null);
  const status = override ?? (isClient ? getBrowserNotificationStatus() : "unsupported");

  if (!isClient || status === "unsupported") {
    return null;
  }

  const handleToggle = async () => {
    if (status === "denied") {
      toast.info("Trình duyệt đang chặn thông báo. Vui lòng bật quyền Thông báo ở biểu tượng ổ khoá cạnh thanh địa chỉ.");
      return;
    }
    if (status === "granted") {
      const next = setBrowserNotificationsPaused(true);
      setOverride(next);
      toast.info("Đã tạm tắt thông báo nền trên trình duyệt.");
      return;
    }
    if (status === "paused") {
      const next = setBrowserNotificationsPaused(false);
      setOverride(next);
      toast.success("Đã bật lại thông báo nền khi chuyển tab / thu nhỏ cửa sổ.");
      return;
    }
    const next = await requestAndEnableBrowserNotifications();
    setOverride(next);
    if (next === "granted") {
      toast.success("Đã bật thông báo trình duyệt cho tin nhắn và thông báo CLB!");
    } else if (next === "denied") {
      toast.error("Bạn đã từ chối quyền thông báo trên trình duyệt.");
    }
  };

  const active = status === "granted";

  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "outline"}
      onClick={() => void handleToggle()}
      title="Nhận thông báo nổi trên màn hình máy tính / điện thoại ngay cả khi đang mở tab khác"
    >
      {active ? <BellRing size={14} /> : <BellOff size={14} />}
      {active
        ? "Thông báo nền: Đang bật"
        : status === "denied"
          ? "Thông báo nền: Bị chặn"
          : "Bật thông báo nền"}
    </Button>
  );
}
