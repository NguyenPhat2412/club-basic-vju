import QRCode from "qrcode";
import { isYouthUnionCode, participantRoleLabel } from "@/lib/club/youth-union";
import { resolveMediaUrl } from "@/lib/media";
import type { EventCertificate, PublicCertificateVerification } from "@/types/certificate/certificate.types";
import { escapeHtml } from "@/utils/export/tabular-export";

export type PrintableCertificateData = Pick<
  EventCertificate,
  | "certificateCode"
  | "status"
  | "recipientName"
  | "studentCode"
  | "clubCode"
  | "clubName"
  | "eventTitle"
  | "eventStartTime"
  | "academicTerm"
  | "participantType"
  | "eventRole"
  | "issuedAt"
  | "revokedAt"
  | "revocationReason"
  | "verificationSha256"
  | "templateImageUrl"
>;

export type PrintableCertificateInput = EventCertificate | PublicCertificateVerification | PrintableCertificateData;

export function certificateTitleForParticipant(participantType?: string | null): string {
  switch ((participantType ?? "").trim().toUpperCase()) {
    case "ORGANIZER":
      return "GIẤY CHỨNG NHẬN BAN TỔ CHỨC";
    case "CTV":
      return "GIẤY CHỨNG NHẬN CỘNG TÁC VIÊN";
    case "ATTENDEE":
    case "MEMBER":
      return "GIẤY CHỨNG NHẬN THAM GIA SỰ KIỆN";
    default:
      return "GIẤY CHỨNG NHẬN";
  }
}

export function buildCertificateVerifyUrl(certificateCode: string, origin?: string): string {
  const path = `/verify/${encodeURIComponent(certificateCode.trim())}`;
  if (!origin) return path;
  return `${origin.replace(/\/+$/, "")}${path}`;
}

export function formatVietnameseCertificateDate(raw?: string | null): string {
  if (!raw?.trim()) return "—";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw.trim();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(parsed);
  const dd = parts.find((p) => p.type === "day")?.value ?? String(parsed.getDate()).padStart(2, "0");
  const mm = parts.find((p) => p.type === "month")?.value ?? String(parsed.getMonth() + 1).padStart(2, "0");
  const yyyy = parts.find((p) => p.type === "year")?.value ?? String(parsed.getFullYear());
  return `ngày ${dd} tháng ${mm} năm ${yyyy}`;
}

function sanitizeTemplateImageSrc(rawUrl?: string | null): string {
  if (!rawUrl?.trim()) return "";
  const resolved = resolveMediaUrl(rawUrl.trim()) || rawUrl.trim();
  if (/^(https?:\/\/|\/|data:image\/(?:png|jpeg|webp);base64,)/i.test(resolved)) {
    return resolved;
  }
  return "";
}

export function buildEventCertificateHtml(
  cert: PrintableCertificateInput,
  verifyUrl: string,
  qrDataUrl?: string,
): string {
  const isYouthUnion = isYouthUnionCode(cert.clubCode);
  const issuingUnit = isYouthUnion
    ? "ĐOÀN THANH NIÊN TRƯỜNG ĐH VIỆT NHẬT"
    : cert.clubName;
  const signerTitle = isYouthUnion
    ? "TM. BAN CHẤP HÀNH ĐOÀN TRƯỜNG ĐH VIỆT NHẬT"
    : `TM. BAN CHỦ NHIỆM ${cert.clubName.toUpperCase()}`;
  const heading = certificateTitleForParticipant(cert.participantType);
  const roleLabel = participantRoleLabel(cert.participantType);
  const eventDateText = formatVietnameseCertificateDate(cert.eventStartTime);
  const issuedDateText = formatVietnameseCertificateDate(cert.issuedAt);
  const shortHash = cert.verificationSha256
    ? `${cert.verificationSha256.slice(0, 24)}…`
    : "—";
  const isRevoked = cert.status === "REVOKED";
  const safeQrSrc =
    qrDataUrl && /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[a-zA-Z0-9+/=]+$/.test(qrDataUrl)
      ? qrDataUrl
      : "";
  const safeTemplateSrc = sanitizeTemplateImageSrc(cert.templateImageUrl);
  const hasCustomTemplate = Boolean(safeTemplateSrc);
  const verifyPathLabel = `/verify/${encodeURIComponent(cert.certificateCode)}`;

  const metaItems = [
    cert.studentCode ? `<span><strong>MSSV:</strong> ${escapeHtml(cert.studentCode)}</span>` : "",
    `<span><strong>Vai trò:</strong> ${escapeHtml(roleLabel)}</span>`,
    cert.eventRole ? `<span><strong>Nhiệm vụ:</strong> ${escapeHtml(cert.eventRole)}</span>` : "",
    cert.academicTerm ? `<span><strong>Học kỳ:</strong> ${escapeHtml(cert.academicTerm)}</span>` : "",
    `<span><strong>Thời gian sự kiện:</strong> ${escapeHtml(eventDateText)}</span>`,
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(heading)} — ${escapeHtml(cert.certificateCode)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 18px; background: rgb(248, 250, 252); color: rgb(15, 23, 42); font-family: "Times New Roman", "Source Serif 4", Georgia, serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet { position: relative; width: 277mm; min-height: 188mm; margin: 0 auto; padding: 10mm; background: rgb(255, 255, 255); border: 3px solid rgb(153, 27, 27); box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08); overflow: hidden; }
    .sheet.has-template { padding: 0; border-width: 1px; border-color: rgb(203, 213, 225); }
    .template-bg { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; object-fit: cover; }
    .inner-frame { position: relative; z-index: 2; min-height: 166mm; border: 1.5px solid rgb(203, 213, 225); padding: 10mm 14mm 8mm; display: flex; flex-direction: column; justify-content: space-between; }
    .sheet.has-template .inner-frame { min-height: 188mm; border: none; padding: 12mm 16mm 10mm; background: rgba(255, 255, 255, 0.78); }
    .revoked-banner { margin-bottom: 10px; padding: 8px 14px; border: 2px solid rgb(190, 18, 60); background: rgb(255, 241, 242); color: rgb(159, 18, 57); text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; }
    .revoked-watermark { position: absolute; inset: 0; z-index: 3; display: flex; align-items: center; justify-content: center; pointer-events: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 86px; font-weight: 800; letter-spacing: 0.16em; color: rgba(190, 18, 60, 0.14); transform: rotate(-22deg); user-select: none; }
    .header { text-align: center; border-bottom: 1px solid rgb(226, 232, 240); padding-bottom: 10px; }
    .university { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: rgb(71, 85, 105); text-transform: uppercase; }
    .unit { margin-top: 4px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 14px; font-weight: 800; letter-spacing: 0.05em; color: rgb(153, 27, 27); text-transform: uppercase; }
    .main { text-align: center; padding: 12px 10px; }
    .title { margin: 0; font-size: 30px; font-weight: 700; letter-spacing: 0.04em; color: rgb(153, 27, 27); }
    .subtitle { margin-top: 4px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; color: rgb(100, 116, 139); text-transform: uppercase; }
    .present-to { margin-top: 16px; font-size: 15px; font-style: italic; color: rgb(71, 85, 105); }
    .recipient { margin: 6px 0 8px; font-size: 34px; font-weight: 700; color: rgb(15, 23, 42); line-height: 1.2; }
    .statement { margin: 8px auto 0; max-width: 210mm; font-size: 16px; line-height: 1.55; color: rgb(30, 41, 59); }
    .event-title { display: block; margin-top: 6px; font-size: 20px; font-weight: 700; color: rgb(15, 23, 42); }
    .meta-row { margin: 14px auto 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 18px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 12px; color: rgb(51, 65, 85); }
    .footer { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgb(226, 232, 240); display: flex; justify-content: space-between; align-items: flex-end; gap: 18px; }
    .verify-box { display: flex; align-items: center; gap: 12px; text-align: left; max-width: 58%; background: rgba(255, 255, 255, 0.88); padding: 6px 8px; border-radius: 6px; }
    .qr-img { width: 96px; height: 96px; border: 1px solid rgb(203, 213, 225); padding: 4px; background: rgb(255, 255, 255); flex-shrink: 0; }
    .verify-meta { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 11px; line-height: 1.5; color: rgb(71, 85, 105); }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: rgb(15, 23, 42); font-weight: 600; word-break: break-all; }
    .sign-box { text-align: center; min-width: 240px; font-size: 13px; color: rgb(30, 41, 59); }
    .sign-date { font-style: italic; margin-bottom: 4px; }
    .sign-role { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 11px; font-weight: 700; color: rgb(15, 23, 42); letter-spacing: 0.03em; }
    .sign-note { margin-top: 34px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 10.5px; color: rgb(100, 116, 139); }
    @media print { body { padding: 0; background: rgb(255, 255, 255); } .sheet { width: auto; min-height: 185mm; box-shadow: none; } }
  </style>
</head>
<body>
  <div class="sheet${hasCustomTemplate ? " has-template" : ""}">
    ${hasCustomTemplate ? `<img class="template-bg" src="${escapeHtml(safeTemplateSrc)}" alt="Phôi chứng nhận ${escapeHtml(issuingUnit)}" />` : ""}
    ${isRevoked ? '<div class="revoked-watermark">REVOKED</div>' : ""}
    <div class="inner-frame">
      <div>
        ${
          isRevoked
            ? `<div class="revoked-banner">REVOKED · CHỨNG NHẬN ĐÃ BỊ THU HỒI${
                cert.revocationReason ? ` — Lý do: ${escapeHtml(cert.revocationReason)}` : ""
              }</div>`
            : ""
        }
        <header class="header">
          <div class="university">ĐẠI HỌC QUỐC GIA HÀ NỘI · TRƯỜNG ĐẠI HỌC VIỆT NHẬT (VJU)</div>
          <div class="unit">${escapeHtml(issuingUnit)}</div>
        </header>
      </div>

      <main class="main">
        <h1 class="title">${escapeHtml(heading)}</h1>
        <div class="subtitle">VJU ClubHub Electronic Certificate · Chứng nhận điện tử</div>

        <div class="present-to">Trân trọng chứng nhận sinh viên</div>
        <div class="recipient">${escapeHtml(cert.recipientName)}</div>

        <div class="statement">
          Đã hoàn thành vai trò <strong>${escapeHtml(roleLabel)}</strong>${
            cert.eventRole ? ` (${escapeHtml(cert.eventRole)})` : ""
          } trong sự kiện:
          <span class="event-title">${escapeHtml(cert.eventTitle)}</span>
        </div>

        <div class="meta-row">${metaItems.join("")}</div>
      </main>

      <footer class="footer">
        <div class="verify-box">
          ${
            safeQrSrc
              ? `<img class="qr-img" src="${escapeHtml(safeQrSrc)}" alt="QR xác thực ${escapeHtml(cert.certificateCode)}" />`
              : ""
          }
          <div class="verify-meta">
            <div>Mã chứng nhận: <span class="mono">${escapeHtml(cert.certificateCode)}</span></div>
            <div>SHA-256: <span class="mono">${escapeHtml(shortHash)}</span></div>
            <div>Xác thực trực tuyến: <span class="mono">${escapeHtml(verifyUrl || verifyPathLabel)}</span></div>
            <div>Đường dẫn tra cứu: <span class="mono">${escapeHtml(verifyPathLabel)}</span></div>
          </div>
        </div>

        <div class="sign-box">
          <div class="sign-date">Hà Nội, ${escapeHtml(issuedDateText)}</div>
          <div class="sign-role">${escapeHtml(signerTitle)}</div>
          <div class="sign-note">Chứng nhận điện tử có giá trị xác thực qua VJU ClubHub</div>
        </div>
      </footer>
    </div>
  </div>
</body>
</html>`;
}

export async function openPrintableEventCertificate(cert: PrintableCertificateInput): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const verifyUrl = buildCertificateVerifyUrl(cert.certificateCode, window.location.origin);
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1120,height=780");
  if (!popup) {
    throw new Error("Trình duyệt đang chặn cửa sổ bật lên. Vui lòng cho phép pop-up để in hoặc lưu PDF.");
  }

  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 140, margin: 1 });
  } catch {
    qrDataUrl = "";
  }

  const html = buildEventCertificateHtml(cert, verifyUrl, qrDataUrl);
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  setTimeout(() => {
    try {
      popup.print();
    } catch {
      // User can trigger print manually inside the preview window
    }
  }, 260);
  return true;
}
