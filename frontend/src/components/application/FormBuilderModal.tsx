"use client";

import { useMutation } from "@tanstack/react-query";
import { FilePlus2, Plus, Trash2 } from "lucide-react";
import {
  apiModel,
  ApplicationFieldType,
  ApplicationForm,
  UpsertApplicationFormInput,
} from "@/lib/api";
import { ModalShell } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : undefined);

export function FormBuilderModal({
  clubId,
  open,
  onClose,
  editingFormId,
  formDraft,
  setFormDraft,
  onSaved,
  onError,
}: {
  clubId: string;
  open: boolean;
  onClose: () => void;
  editingFormId: string | null;
  formDraft: UpsertApplicationFormInput;
  setFormDraft: React.Dispatch<React.SetStateAction<UpsertApplicationFormInput>>;
  onSaved: (saved: ApplicationForm, isEdit: boolean) => void;
  onError: (msg: string) => void;
}) {
  const saveFormMutation = useMutation({
    mutationFn: () => {
      const cleaned: UpsertApplicationFormInput = {
        ...formDraft,
        fields: formDraft.fields.map((f, i) => ({
          ...f,
          key: f.key || `question_${i + 1}`,
          options: (f.options ?? []).map((s) => s.trim()).filter(Boolean),
        })),
      };
      return editingFormId
        ? apiModel.updateClubApplicationForm(clubId, editingFormId, cleaned)
        : apiModel.createClubApplicationForm(clubId, cleaned);
    },
    onSuccess: (saved) => {
      onSaved(saved, !!editingFormId);
      onClose();
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={editingFormId ? "Chỉnh sửa biểu mẫu đơn đăng ký" : "Tạo biểu mẫu đơn đăng ký CLB"}
      icon={<FilePlus2 />}
      size="lg"
      onSubmit={() => saveFormMutation.mutate()}
      submitLabel={editingFormId ? "Lưu biểu mẫu" : "Tạo biểu mẫu"}
      submitLoading={saveFormMutation.isPending}
      submitDisabled={!formDraft.title.trim()}
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <FormField label="Tiêu đề biểu mẫu / Đợt tuyển thành viên" required>
              <Input
                value={formDraft.title}
                onChange={(e) => setFormDraft({ ...formDraft, title: e.target.value })}
                placeholder="VD: Đơn đăng ký tuyển thành viên Gen 5"
              />
            </FormField>
          </div>
          <FormField label="Trạng thái mở đơn">
            <Select
              value={formDraft.status}
              onChange={(e) =>
                setFormDraft({ ...formDraft, status: e.target.value as UpsertApplicationFormInput["status"] })
              }
            >
              <option value="OPEN">OPEN (Đang mở nhận đơn)</option>
              <option value="CLOSED">CLOSED (Đã đóng đơn)</option>
              <option value="DRAFT">DRAFT (Bản nháp)</option>
            </Select>
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Mở nhận đơn từ" hint="Để trống: nhận ngay khi trạng thái là OPEN">
            <Input
              type="datetime-local"
              value={toLocalInput(formDraft.openAt)}
              onChange={(e) => setFormDraft({ ...formDraft, openAt: fromLocalInput(e.target.value) })}
            />
          </FormField>
          <FormField label="Đóng nhận đơn lúc" hint="Để trống: nhận đến khi chuyển sang CLOSED">
            <Input
              type="datetime-local"
              value={toLocalInput(formDraft.closeAt)}
              onChange={(e) => setFormDraft({ ...formDraft, closeAt: fromLocalInput(e.target.value) })}
            />
          </FormField>
        </div>

        <FormField label="Hướng dẫn & Mô tả biểu mẫu">
          <Textarea
            rows={3}
            value={formDraft.description || ""}
            onChange={(e) => setFormDraft({ ...formDraft, description: e.target.value })}
            placeholder="Hướng dẫn ứng viên tải file đơn mẫu (.docx/.pdf), điền thông tin và đính kèm minh chứng..."
          />
        </FormField>

        <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={!!formDraft.isDefault}
              onChange={(e) => setFormDraft({ ...formDraft, isDefault: e.target.checked })}
            />
            <span>Đặt làm biểu mẫu mặc định của CLB</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={!!formDraft.allowAttachments}
              onChange={(e) => setFormDraft({ ...formDraft, allowAttachments: e.target.checked })}
            />
            <span>Cho phép đính kèm file (.docx/.pdf/ảnh)</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={!!formDraft.requireAttachment}
              onChange={(e) => setFormDraft({ ...formDraft, requireAttachment: e.target.checked })}
            />
            <span>Bắt buộc ứng viên đính kèm file</span>
          </label>
        </div>

        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/[0.02] p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Thiết kế câu hỏi tuỳ chỉnh ({formDraft.fields.length})
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setFormDraft({
                  ...formDraft,
                  fields: [
                    ...formDraft.fields,
                    {
                      key: `question_${Date.now()}_${formDraft.fields.length + 1}`,
                      label: "",
                      type: "TEXT",
                      required: false,
                      placeholder: "",
                      options: [],
                    },
                  ],
                })
              }
            >
              <Plus size={13} /> Thêm câu hỏi
            </Button>
          </div>

          {formDraft.fields.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nhấn &ldquo;Thêm câu hỏi&rdquo; để tạo thêm các trường riêng cho CLB (VD: Ca phỏng vấn, Link sản phẩm cá nhân, Câu hỏi tình huống...).
            </p>
          )}

          {formDraft.fields.map((field, idx) => (
            <div key={idx} className="space-y-2.5 rounded-lg border border-border bg-card p-3">
              <div className="grid gap-2.5 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <FormField label={`Câu hỏi #${idx + 1}`} required>
                    <Input
                      value={field.label}
                      placeholder="VD: Bạn có thể tham gia phỏng vấn vào khung giờ nào?"
                      onChange={(e) => {
                        const next = [...formDraft.fields];
                        next[idx] = {
                          ...field,
                          label: e.target.value,
                          key: field.key || `q_${idx + 1}`,
                        };
                        setFormDraft({ ...formDraft, fields: next });
                      }}
                    />
                  </FormField>
                </div>
                <FormField label="Loại ô nhập">
                  <Select
                    value={field.type}
                    onChange={(e) => {
                      const next = [...formDraft.fields];
                      next[idx] = { ...field, type: e.target.value as ApplicationFieldType };
                      setFormDraft({ ...formDraft, fields: next });
                    }}
                  >
                    <option value="TEXT">Văn bản ngắn (TEXT)</option>
                    <option value="TEXTAREA">Đoạn văn dài (TEXTAREA)</option>
                    <option value="SELECT">Danh sách chọn (SELECT)</option>
                    <option value="RADIO">Chọn 1 phương án (RADIO)</option>
                    <option value="CHECKBOX">Hộp kiểm xác nhận (CHECKBOX)</option>
                    <option value="DATE">Ngày tháng (DATE)</option>
                    <option value="URL">Đường dẫn (URL)</option>
                  </Select>
                </FormField>
              </div>

              {(field.type === "SELECT" || field.type === "RADIO") && (
                <FormField label="Các lựa chọn (phân tách bằng dấu phẩy)">
                  <Input
                    value={(field.options ?? []).join(", ")}
                    placeholder="VD: Sáng Thứ 7, Chiều Thứ 7, Sáng Chủ Nhật"
                    onChange={(e) => {
                      const next = [...formDraft.fields];
                      next[idx] = {
                        ...field,
                        options: e.target.value.split(",").map((s) => s.trimStart()),
                      };
                      setFormDraft({ ...formDraft, fields: next });
                    }}
                  />
                </FormField>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={field.required}
                    onChange={(e) => {
                      const next = [...formDraft.fields];
                      next[idx] = { ...field, required: e.target.checked };
                      setFormDraft({ ...formDraft, fields: next });
                    }}
                  />
                  <span>Bắt buộc trả lời</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormDraft({
                      ...formDraft,
                      fields: formDraft.fields.filter((_, i) => i !== idx),
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
                >
                  <Trash2 size={12} /> Xoá câu hỏi này
                </button>
              </div>
            </div>
          ))}
        </div>

        {saveFormMutation.error && <p className="text-xs text-destructive">{describeError(saveFormMutation.error)}</p>}
      </div>
    </ModalShell>
  );
}
