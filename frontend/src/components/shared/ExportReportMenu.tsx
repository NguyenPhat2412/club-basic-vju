"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { describeError } from "@/components/shared/ListPage";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function ExportReportMenu({
  onExport,
  disabled = false,
  compact = false,
}: {
  onExport: (mode: "csv" | "pdf") => Promise<number> | number;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [busyMode, setBusyMode] = useState<"csv" | "pdf" | null>(null);

  const run = async (mode: "csv" | "pdf") => {
    if (busyMode || disabled) return;
    setBusyMode(mode);
    try {
      const count = await onExport(mode);
      toast.success(
        mode === "csv"
          ? `Đã xuất ${count} dòng ra tệp Excel (.csv).`
          : `Đã mở bản in / lưu PDF cho ${count} dòng dữ liệu.`
      );
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setBusyMode(null);
    }
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busyMode !== null}
        onClick={() => void run("csv")}
        title="Tải xuống tệp CSV chuẩn UTF-8 mở trực tiếp bằng Microsoft Excel / Google Sheets"
        className={compact ? "h-8 text-xs" : undefined}
      >
        <Download size={13} />
        {busyMode === "csv" ? "Đang xuất…" : "Xuất Excel (.csv)"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busyMode !== null}
        onClick={() => void run("pdf")}
        title="Mở biểu mẫu báo cáo chuẩn VJU để in hoặc lưu thành PDF"
        className={compact ? "h-8 text-xs" : undefined}
      >
        <FileText size={13} />
        {busyMode === "pdf" ? "Đang mở…" : "Báo cáo PDF"}
      </Button>
    </div>
  );
}
