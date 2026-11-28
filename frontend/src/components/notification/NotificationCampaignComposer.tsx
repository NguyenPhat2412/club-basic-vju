"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Mail, Megaphone, Send, Users } from "lucide-react";
import {
  apiModel,
  type NotificationAudienceType,
  type NotificationCampaignCategory,
} from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

interface NotificationCampaignComposerProps {
  hasGlobalSend: boolean;
  onSent: () => void;
}

export function NotificationCampaignComposer({
  hasGlobalSend,
  onSent,
}: NotificationCampaignComposerProps) {
  const queryClient = useQueryClient();
  const [audienceType, setAudienceType] = useState<NotificationAudienceType>(
    hasGlobalSend ? "ALL_USERS" : "CLUBS",
  );
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>([]);
  const [category, setCategory] = useState<NotificationCampaignCategory>("DOCUMENT");
  const [documentId, setDocumentId] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const clubsQuery = useQuery({
    queryKey: qk.clubs("notif-campaigns"),
    queryFn: () => apiModel.clubs("", "", 0, 100),
  });

  const systemDocsQuery = useQuery({
    queryKey: qk.documents("system-notif-picker"),
    queryFn: () => apiModel.systemDocuments({ offset: 0, limit: 50 }),
  });

  const activeClubs = useMemo(
    () => (clubsQuery.data?.items ?? []).filter((c) => c.status === "ACTIVE"),
    [clubsQuery.data?.items],
  );

  const previewEnabled =
    audienceType !== "CLUBS" || selectedClubIds.length > 0;

  const previewQuery = useQuery({
    queryKey: qk.notificationAudiencePreview(audienceType, selectedClubIds.join(",")),
    queryFn: () => apiModel.previewNotificationAudience(audienceType, selectedClubIds),
    enabled: previewEnabled,
    staleTime: 15_000,
  });

  const sendMut = useMutation({
    mutationFn: () =>
      apiModel.createNotificationCampaign({
        title: title.trim(),
        message: message.trim(),
        audienceType,
        clubIds: audienceType === "CLUBS" ? selectedClubIds : undefined,
        category,
        documentId: documentId || null,
        sendEmail,
      }),
    onSuccess: (created) => {
      toast.success(`Đã phát thông báo tới ${created.deliveredCount} người nhận.`);
      setTitle("");
      setMessage("");
      setDocumentId("");
      queryClient.invalidateQueries({ queryKey: qk.notificationCampaigns() });
      queryClient.invalidateQueries({ queryKey: qk.notifications() });
      queryClient.invalidateQueries({ queryKey: qk.unreadSummary() });
      onSent();
    },
    onError: (err) => toast.error(describeError(err)),
  });

  const toggleClub = (clubId: string) => {
    setSelectedClubIds((prev) =>
      prev.includes(clubId) ? prev.filter((id) => id !== clubId) : [...prev, clubId],
    );
  };

  const canSubmit =
    Boolean(title.trim() && message.trim()) &&
    (audienceType !== "CLUBS" || selectedClubIds.length > 0) &&
    !sendMut.isPending;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSubmit) sendMut.mutate();
  };

  return (
    <form
      onSubmit={onSubmit}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2">
        <div className="flex items-center gap-2">
          <Megaphone size={14} className="text-primary" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Soạn & Phát thông báo hàng loạt
          </h3>
          {previewEnabled && previewQuery.data && (
            <Badge tone="primary">
              <Users size={11} />
              <span>{`${previewQuery.data.recipientCount} người nhận`}</span>
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
            <Mail size={13} className="text-primary" />
            <span>Gửi kèm Email</span>
            <button
              type="button"
              role="switch"
              aria-label="Gửi kèm Email"
              aria-checked={sendEmail}
              onClick={() => setSendEmail((v) => !v)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                sendEmail ? "bg-primary" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute left-0 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
                  sendEmail ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          <Button type="submit" size="sm" className="h-8" disabled={!canSubmit}>
            <Send size={13} />
            {sendMut.isPending ? "Đang phát…" : "Phát thông báo"}
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {/* Horizontal row 1: Audience | Category | Attached Document */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">Đối tượng nhận</label>
            <Select
              aria-label="Đối tượng nhận"
              value={audienceType}
              onChange={(e) => setAudienceType(e.target.value as NotificationAudienceType)}
              className="h-8.5 text-xs"
            >
              {hasGlobalSend && <option value="ALL_USERS">Toàn hệ thống</option>}
              {hasGlobalSend && <option value="CLUB_LEADERS">Ban Chủ nhiệm các CLB</option>}
              <option value="CLUBS">Chọn câu lạc bộ cụ thể</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">Phân loại</label>
            <Select
              aria-label="Phân loại"
              value={category}
              onChange={(e) => setCategory(e.target.value as NotificationCampaignCategory)}
              className="h-8.5 text-xs"
            >
              <option value="DOCUMENT">Hồ sơ & Công văn</option>
              <option value="SYSTEM">Thông báo hệ thống</option>
              <option value="ANNOUNCEMENT">Thông báo chung</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <FileText size={12} className="text-primary" />
              <span>Đính kèm tài liệu hệ thống</span>
            </label>
            <Select
              aria-label="Đính kèm tài liệu hệ thống"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="h-8.5 text-xs"
            >
              <option value="">Không đính kèm</option>
              {(systemDocsQuery.data?.items ?? []).map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Multi-club pill selector when CLUBS is chosen */}
        {audienceType === "CLUBS" && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
            <span className="mr-1 text-[11px] font-semibold text-slate-600">Chọn CLB:</span>
            {activeClubs.map((club) => {
              const selected = selectedClubIds.includes(club.id);
              return (
                <button
                  key={club.id}
                  type="button"
                  onClick={() => toggleClub(club.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    selected
                      ? "bg-primary text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span data-no-i18n="true">{club.code}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Horizontal row 2: Title & Message */}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">Tiêu đề thông báo</label>
            <Input
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Hạn nộp hồ sơ tổng kết hoạt động học kỳ"
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">Nội dung chi tiết</label>
            <Input
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập nội dung thông báo, thời hạn nộp giấy tờ hoặc hướng dẫn xử lý…"
              className="h-9 text-xs"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
