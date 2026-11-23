"use client";

import { Lock, Upload } from "lucide-react";
import type { Department, DocumentVisibility } from "@/lib/api";
import { CLUB_CATEGORY_PRESETS, SYSTEM_CATEGORY_PRESETS } from "@/forms/document/document-filter-meta";
import { ModalShell } from "@/components/shared/Overlays";
import { FormField, Input, Select } from "@/components/ui/input";
import { cn, formatSize, validateVaultFile, VAULT_ACCEPT } from "@/lib/utils";

const APP_KEY_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;

export function DocumentUploadModal({
  open,
  submitting,
  isSystemTier,
  isClubOfficer = true,
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
  isClubOfficer?: boolean;
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
                <option value="OFFICERS">Bảo mật riêng Ban Chủ nhiệm (Sổ Quỹ / BCN)</option>
              </>
            ) : (
              <>
                <option value="MEMBERS">Tất cả Thành viên CLB</option>
                {isClubOfficer && (
                  <option value="OFFICERS">Bảo mật riêng Ban Chủ nhiệm (Sổ Quỹ / BCN)</option>
                )}
              </>
            )}
          </Select>
          {uploadVis === "OFFICERS" && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary">
              <Lock size={11} className="shrink-0" />
              Tệp được cô lập hoàn toàn khỏi thành viên thường (chỉ Ban Chủ nhiệm &amp; Quản trị xem/tải được).
            </p>
          )}
        </FormField>
      )}
      <FormField label="Tên hiển thị" hint="Bỏ trống để giữ tên gốc của file">
        <Input value={uploadName} maxLength={200} onChange={(e) => onUploadName(e.target.value)} />
      </FormField>
      <FormField
        label="Nhãn phân loại (appDetailKey)"
        hint="Chọn nhanh bên dưới hoặc nhập mã phân loại (ví dụ: finance.fund, club.rules)"
        error={appKeyError ?? undefined}
      >
        <Input
          list="vju-doc-category-keys-upload"
          value={appKey}
          maxLength={100}
          onChange={(e) => onAppKey(e.target.value)}
        />
        <datalist id="vju-doc-category-keys-upload">
          {(isSystemTier ? SYSTEM_CATEGORY_PRESETS : CLUB_CATEGORY_PRESETS).map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </datalist>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(isSystemTier ? SYSTEM_CATEGORY_PRESETS : CLUB_CATEGORY_PRESETS).map((preset) => {
            const active = trimmedKey === preset.value;
            const isBcnPreset = "bcnRecommended" in preset && Boolean(preset.bcnRecommended);
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  onAppKey(preset.value);
                  if (isBcnPreset && !isSystemTier && isClubOfficer && !uploadDeptId) {
                    onUploadVis("OFFICERS");
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                {isBcnPreset && <Lock size={10} className="shrink-0 text-primary" />}
                {preset.label}
              </button>
            );
          })}
        </div>
      </FormField>
      <p className="text-xs text-muted-foreground">
        Hỗ trợ pdf, doc(x), xls(x), ppt(x), txt, csv, md, png, jpg, gif, webp, zip · tối đa 20 MB · lưu trữ tập trung chống mất dữ liệu.
      </p>
    </ModalShell>
  );
}
