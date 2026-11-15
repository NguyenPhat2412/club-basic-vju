"use client";

import { Upload } from "lucide-react";
import type { Department, DocumentVisibility } from "@/lib/api";
import { ModalShell } from "@/components/shared/Overlays";
import { FormField, Input, Select } from "@/components/ui/input";
import { formatSize, validateVaultFile, VAULT_ACCEPT } from "@/lib/utils";

const APP_KEY_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;

export function DocumentUploadModal({
  open,
  submitting,
  isSystemTier,
  clubCode,
  canUploadClubWide,
  uploadableDepts,
  file,
  onFile,
  uploadDeptId,
  onUploadDeptId,
  uploadVis,
  onUploadVis,
  uploadName,
  onUploadName,
  appKey,
  onAppKey,
  onClose,
  onSubmit,
}: {
  open: boolean;
  submitting?: boolean;
  isSystemTier: boolean;
  clubCode?: string;
  canUploadClubWide: boolean;
  uploadableDepts: Department[];
  file: File | null;
  onFile: (f: File | null) => void;
  uploadDeptId: string;
  onUploadDeptId: (id: string) => void;
  uploadVis: DocumentVisibility;
  onUploadVis: (vis: DocumentVisibility) => void;
  uploadName: string;
  onUploadName: (v: string) => void;
  appKey: string;
  onAppKey: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const fileError = file ? validateVaultFile(file) : null;
  const trimmedKey = appKey.trim();
  const appKeyError =
    trimmedKey && (trimmedKey.length > 100 || !APP_KEY_RE.test(trimmedKey))
      ? "Chỉ gồm chữ thường, số, dấu gạch dưới và dấu chấm (ví dụ: club.rules)."
      : null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={isSystemTier ? "Tải lên Văn bản Hệ thống" : "Tải lên Kho CLB / Ban"}
      icon={<Upload />}
      onSubmit={onSubmit}
      submitLabel="Tải lên"
      submitLoading={submitting}
      submitDisabled={Boolean(!file || fileError || appKeyError)}
    >
      <FormField label="Tệp tài liệu tải lên" required error={fileError ?? undefined}>
        <div className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/25 bg-primary/5 px-4 py-5 text-center text-sm text-primary hover:bg-primary/8">
          <Upload size={22} />
          <span className="max-w-full truncate font-semibold">
            {file ? `${file.name} · ${formatSize(file.size)}` : "Chọn tệp để lưu vào Kho tập trung"}
          </span>
          <input
            type="file"
            accept={VAULT_ACCEPT}
            aria-label="Chọn tệp tài liệu"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </FormField>

      {!isSystemTier && (
        <FormField label="Không gian lưu trữ" required>
          <Select
            value={uploadDeptId}
            onChange={(e) => {
              const dep = e.target.value;
              onUploadDeptId(dep);
              onUploadVis(dep ? "DEPARTMENT_ONLY" : "MEMBERS");
            }}
          >
            {canUploadClubWide && <option value="">Kho chung toàn CLB ({clubCode})</option>}
            {uploadableDepts.map((dep) => (
              <option key={dep.id} value={dep.id}>
                Kho riêng Ban: {dep.name}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      {(isSystemTier || !uploadDeptId) && (
        <FormField label="Quyền xem tài liệu" required>
          <Select value={uploadVis} onChange={(e) => onUploadVis(e.target.value as DocumentVisibility)}>
            {isSystemTier ? (
              <>
                <option value="PUBLIC_INTERNAL">Toàn trường (Mọi sinh viên & CLB)</option>
                <option value="OFFICERS">Chỉ Ban chủ nhiệm các CLB & Quản trị</option>
              </>
            ) : (
              <>
                <option value="MEMBERS">Tất cả Thành viên CLB</option>
                <option value="OFFICERS">Chỉ Ban chủ nhiệm CLB</option>
              </>
            )}
          </Select>
        </FormField>
      )}
      <FormField label="Tên hiển thị" hint="Bỏ trống để giữ tên gốc của file">
        <Input value={uploadName} maxLength={200} onChange={(e) => onUploadName(e.target.value)} />
      </FormField>
      <FormField label="Nhãn phân loại (appDetailKey)" hint="Ví dụ: system.template, club.rules" error={appKeyError ?? undefined}>
        <Input value={appKey} maxLength={100} onChange={(e) => onAppKey(e.target.value)} />
      </FormField>
      <p className="text-xs text-muted-foreground">
        Hỗ trợ pdf, doc(x), xls(x), ppt(x), txt, csv, md, png, jpg, gif, webp, zip · tối đa 20 MB · lưu trữ tập trung chống mất dữ liệu.
      </p>
    </ModalShell>
  );
}
