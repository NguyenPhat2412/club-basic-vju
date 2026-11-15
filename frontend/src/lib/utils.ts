import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getIntlLocale } from "@/i18n/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSize(bytes: number) {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export const VAULT_MAX_BYTES = 20 * 1024 * 1024;
export const VAULT_ALLOWED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "md", "png", "jpg", "jpeg", "gif", "webp", "zip",
]);
export const VAULT_ACCEPT = Array.from(VAULT_ALLOWED_EXTENSIONS, (e) => `.${e}`).join(",");

export function fileExtension(name: string, contentType?: string): string {
  const dot = name.lastIndexOf(".");
  if (dot > 0 && dot < name.length - 1) return name.slice(dot + 1).toLowerCase();
  const mime = (contentType ?? "").split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "application/pdf": "pdf", "text/plain": "txt", "text/csv": "csv", "text/markdown": "md",
    "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "application/zip": "zip",
  };
  return map[mime] ?? "file";
}

export function validateVaultFile(file: Pick<File, "name" | "size">, expectedExt?: string): string | null {
  if (file.size === 0) return "File rỗng (0 B). Vui lòng chọn tệp có dữ liệu.";
  if (file.size > VAULT_MAX_BYTES) return "File vượt quá dung lượng cho phép (tối đa 20 MB).";
  const ext = fileExtension(file.name);
  const normalizedExt = ext === "jpeg" ? "jpg" : ext;
  if (!VAULT_ALLOWED_EXTENSIONS.has(ext)) {
    return `Định dạng .${ext} không được phép tải lên. Chỉ hỗ trợ pdf, doc(x), xls(x), ppt(x), txt, csv, md, png, jpg, gif, webp, zip.`;
  }
  if (expectedExt) {
    const target = expectedExt.toLowerCase() === "jpeg" ? "jpg" : expectedExt.toLowerCase();
    if (normalizedExt !== target) {
      return `Phiên bản mới phải cùng định dạng .${target} với tài liệu hiện tại.`;
    }
  }
  return null;
}

export const formatDay = (value?: string) => (value ? new Date(value).toLocaleDateString("sv-SE") : "—");
export const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleTimeString(getIntlLocale(), { hour: "2-digit", minute: "2-digit" }) : "";
export const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString(getIntlLocale()) : "—");

export function shortDisplayName(fullName?: string | null, email?: string | null): string {
  const cleaned = (fullName ?? "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned) {
    if (/\badministrator\b/i.test(cleaned)) return "Admin";
    if (/^sinh\s+viên\b/iu.test(cleaned)) return "Sinh viên";
    const parts = cleaned.split(" ");
    if (parts.length === 1) return parts[0];
    const last = parts[parts.length - 1];
    if (last.length === 1 && parts.length >= 2) {
      return `${parts[parts.length - 2]} ${last}`;
    }
    return last;
  }
  if (email) {
    return email.split("@")[0] || "Tài khoản";
  }
  return "Tài khoản";
}

const COMPOUNDS = [
  "câu lạc bộ", "cộng đồng", "sinh viên", "thành viên", "Trường Đại học", "Đại học", "Quốc gia", "Việt Nhật", "Hà Nội",
  "Hòa Lạc", "Việt Nam", "hành trình", "bắt đầu", "phù hợp", "sở thích", "trải nghiệm", "đáng nhớ", "học thuật",
  "văn hóa", "hoạt động", "hào hứng", "lớp học", "thế giới", "gặp gỡ", "dự án", "sự kiện", "khởi xướng", "bản sắc",
  "năng động", "tin tức", "đăng nhập", "đăng ký", "tài khoản", "không gian", "cổng thông tin", "thông tin", "sắc màu",
  "khám phá", "đời sống", "tham gia", "nộp đơn", "trực tuyến", "liên kết",
];
const escapeWord = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const COMPOUND_PATTERN = new RegExp(
  COMPOUNDS.sort((a, b) => b.length - a.length).map(escapeWord).join("|"),
  "giu",
);

export const keepWords = (text: string) =>
  text.replace(COMPOUND_PATTERN, (match) => match.replace(/ /g, "\u00a0"));
