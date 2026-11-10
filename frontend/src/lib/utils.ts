import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getIntlLocale } from "@/i18n/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const formatDay = (value?: string) => (value ? new Date(value).toLocaleDateString("sv-SE") : "—");
export const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleTimeString(getIntlLocale(), { hour: "2-digit", minute: "2-digit" }) : "";
export const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString(getIntlLocale()) : "—");

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
