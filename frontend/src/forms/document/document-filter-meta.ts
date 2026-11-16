import type { DocumentItem } from "@/types/document/document.types";
import { fileExtension } from "@/lib/utils";

export type DocumentFormatFilter = "" | "pdf" | "word" | "sheet" | "slide" | "image" | "other";
export type DocumentSortOption = "newest" | "oldest" | "name_asc" | "size_desc";

export const DOCUMENT_FORMAT_OPTIONS: Array<{ value: DocumentFormatFilter; label: string; shortLabel: string }> = [
  { value: "", label: "Mọi định dạng", shortLabel: "Tất cả" },
  { value: "pdf", label: "PDF (.pdf)", shortLabel: "PDF" },
  { value: "word", label: "Word (.doc, .docx)", shortLabel: "Word" },
  { value: "sheet", label: "Bảng tính (.xls, .xlsx, .csv)", shortLabel: "Bảng tính" },
  { value: "slide", label: "Trình chiếu (.ppt, .pptx)", shortLabel: "Slide" },
  { value: "image", label: "Hình ảnh (.png, .jpg, .webp, .gif)", shortLabel: "Hình ảnh" },
  { value: "other", label: "Khác (.txt, .md, .zip)", shortLabel: "Khác" },
];

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  semester_plan: "Kế hoạch học kỳ",
  club_charter: "Quy chế hoạt động",
  "club.rules": "Nội quy CLB",
  "system.template": "Biểu mẫu trường",
  "system.charter": "Quy chế trường",
  "dept.plan": "Kế hoạch Ban",
  "event.proposal": "Đề án sự kiện",
  "budget.report": "Báo cáo kinh phí",
  "meeting.minutes": "Biên bản họp",
};

const WORD_EXTS = new Set(["doc", "docx"]);
const SHEET_EXTS = new Set(["xls", "xlsx", "csv"]);
const SLIDE_EXTS = new Set(["ppt", "pptx"]);
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

export function formatDocumentCategoryLabel(rawKey?: string | null): string {
  const clean = rawKey?.trim() ?? "";
  if (!clean) return "";
  return DOCUMENT_CATEGORY_LABELS[clean] ?? clean;
}

export function classifyDocumentFormat(doc: Pick<DocumentItem, "name" | "contentType">): Exclude<DocumentFormatFilter, ""> {
  const ext = fileExtension(doc.name, doc.contentType).toLowerCase();
  if (ext === "pdf") return "pdf";
  if (WORD_EXTS.has(ext)) return "word";
  if (SHEET_EXTS.has(ext)) return "sheet";
  if (SLIDE_EXTS.has(ext)) return "slide";
  if (IMAGE_EXTS.has(ext)) return "image";
  return "other";
}

export function matchesDocumentFormat(
  doc: Pick<DocumentItem, "name" | "contentType">,
  filter: DocumentFormatFilter
): boolean {
  if (!filter) return true;
  return classifyDocumentFormat(doc) === filter;
}

export function collectDocumentCategoryOptions(
  items: DocumentItem[],
  activeCategory: string,
  isSystemTier: boolean
): Array<{ value: string; label: string }> {
  const keys = new Set<string>();
  if (isSystemTier) {
    keys.add("system.template");
    keys.add("system.charter");
  } else {
    keys.add("semester_plan");
    keys.add("club_charter");
    keys.add("club.rules");
    keys.add("dept.plan");
  }
  if (activeCategory.trim()) keys.add(activeCategory.trim());
  for (const item of items) {
    const key = item.appDetailKey?.trim();
    if (key) keys.add(key);
  }
  return Array.from(keys).map((key) => {
    const friendly = DOCUMENT_CATEGORY_LABELS[key];
    return {
      value: key,
      label: friendly ? `${friendly} (${key})` : key,
    };
  });
}

export function filterAndSortDocuments(
  items: DocumentItem[],
  opts: {
    scopeFilter: string;
    formatFilter: DocumentFormatFilter;
    sortBy: DocumentSortOption;
  }
): DocumentItem[] {
  const filtered = items.filter((doc) => {
    if (opts.scopeFilter === "__CLUB_ONLY__" && doc.departmentId) return false;
    if (!matchesDocumentFormat(doc, opts.formatFilter)) return false;
    return true;
  });

  if (opts.sortBy === "newest") return filtered;

  return [...filtered].sort((a, b) => {
    if (opts.sortBy === "oldest") {
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    }
    if (opts.sortBy === "name_asc") {
      return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
    }
    if (opts.sortBy === "size_desc") {
      return b.sizeBytes - a.sizeBytes;
    }
    return 0;
  });
}
