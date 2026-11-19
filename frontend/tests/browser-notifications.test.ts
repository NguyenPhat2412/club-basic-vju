import assert from "node:assert/strict";
import test from "node:test";
import {
  dispatchBackgroundBrowserNotification,
  getBrowserNotificationStatus,
} from "@/lib/realtime/browser-notifications";

test("browser notification helpers gracefully degrade to unsupported/no-op outside browser DOM", () => {
  assert.equal(getBrowserNotificationStatus(), "unsupported");
  assert.equal(
    dispatchBackgroundBrowserNotification({
      title: "Đơn đăng ký được duyệt",
      body: "Chào mừng bạn gia nhập CLB!",
      tag: "test-1",
    }),
    false
  );
});
