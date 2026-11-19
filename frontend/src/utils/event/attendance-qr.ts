import QRCode from "qrcode";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildAttendanceQrCheckInUrl(origin: string, eventId: string, token: string): string {
  const base = origin.replace(/\/+$/, "");
  const params = new URLSearchParams({ checkin: eventId, token });
  return `${base}/events?${params.toString()}`;
}

export function parseAttendanceQrInput(raw: string): { eventId: string; token: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/events?")) {
    try {
      const url = new URL(trimmed, "https://vju-club.all1.vn");
      const eventId = url.searchParams.get("checkin")?.trim() ?? "";
      const token = url.searchParams.get("token")?.trim() ?? "";
      if (UUID_RE.test(eventId) && token.startsWith("v1.")) {
        return { eventId, token };
      }
    } catch {
      return null;
    }
  }

  const parts = trimmed.split(".");
  if (parts.length === 5 && parts[0] === "v1" && UUID_RE.test(parts[1])) {
    return { eventId: parts[1], token: trimmed };
  }
  return null;
}

export async function renderAttendanceQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
  });
}
