const PREF_KEY = "vju.browserNotifications";

export type BrowserNotificationStatus =
  | "unsupported"
  | "default"
  | "granted"
  | "paused"
  | "denied";

export function getBrowserNotificationStatus(): BrowserNotificationStatus {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  const perm = window.Notification.permission;
  if (perm === "denied") return "denied";
  if (perm === "default") return "default";
  const pref = window.localStorage.getItem(PREF_KEY);
  return pref === "paused" ? "paused" : "granted";
}

export async function requestAndEnableBrowserNotifications(): Promise<BrowserNotificationStatus> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (window.Notification.permission === "granted") {
    window.localStorage.setItem(PREF_KEY, "enabled");
    return "granted";
  }
  const result = await window.Notification.requestPermission();
  if (result === "granted") {
    window.localStorage.setItem(PREF_KEY, "enabled");
    return "granted";
  }
  return result === "denied" ? "denied" : "default";
}

export function setBrowserNotificationsPaused(paused: boolean): BrowserNotificationStatus {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PREF_KEY, paused ? "paused" : "enabled");
  }
  return getBrowserNotificationStatus();
}

export function dispatchBackgroundBrowserNotification({
  title,
  body,
  tag,
  onClick,
}: {
  title: string;
  body: string;
  tag: string;
  onClick?: () => void;
}): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (document.visibilityState === "visible") return false;
  if (getBrowserNotificationStatus() !== "granted") return false;

  try {
    const n = new window.Notification(title, {
      body,
      tag,
    });
    n.onclick = () => {
      window.focus();
      n.close();
      onClick?.();
    };
    return true;
  } catch {
    return false;
  }
}
