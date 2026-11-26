"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bus, ChevronDown, ChevronUp, Layers, Map as MapIcon, Share2, Users } from "lucide-react";
import { apiModel } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { Badge } from "@/components/ui/badge";
import { FormField, Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EventFormValues } from "@/forms/event/event-form";

export function EventFestivalCampaignFields({
  clubId,
  editingId,
  form,
  setForm,
}: {
  clubId: string;
  editingId?: string;
  form: EventFormValues;
  setForm: React.Dispatch<React.SetStateAction<EventFormValues>>;
}) {
  const hasInitialValues = Boolean(
    form.parentEventId ||
      form.boothCode ||
      form.venueMapUrl ||
      form.facebookPostUrl ||
      form.recapAlbumUrl ||
      form.allowShuttleBus ||
      form.coHostClubIds.length > 0,
  );
  const [open, setOpen] = useState(hasInitialValues);

  const publicEventsQuery = useQuery({
    queryKey: qk.eventsPortal("festival-parent-options"),
    queryFn: () => apiModel.publicEvents(0, 100),
    enabled: open,
    staleTime: 60_000,
  });

  const publicClubsQuery = useQuery({
    queryKey: qk.publicClubs("festival-cohost-options"),
    queryFn: () => apiModel.publicClubs("", "", 0, 100),
    enabled: open,
    staleTime: 60_000,
  });

  const parentOptions = useMemo(
    () =>
      (publicEventsQuery.data?.items ?? []).filter(
        (ev) => ev.id !== editingId && !ev.parentEventId && ev.status !== "CANCELLED",
      ),
    [publicEventsQuery.data?.items, editingId],
  );

  const coHostOptions = useMemo(
    () => (publicClubsQuery.data?.items ?? []).filter((c) => c.id !== clubId),
    [publicClubsQuery.data?.items, clubId],
  );

  const toggleCoHost = (targetClubId: string) => {
    setForm((prev) => ({
      ...prev,
      coHostClubIds: prev.coHostClubIds.includes(targetClubId)
        ? prev.coHostClubIds.filter((id) => id !== targetClubId)
        : [...prev.coHostClubIds, targetClubId],
    }));
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Layers size={14} className="shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-foreground">
              Lễ hội đa CLB, Gian hàng, Bản đồ chơi &amp; Xe bus Hòa Lạc (tuỳ chọn)
            </p>
            <p className="text-[11px] text-muted-foreground">
              Dành cho Tết Việt Nhật (Oshougatsu), Welcome Ceremony, Club Day hoặc sự kiện đồng tổ chức.
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Thuộc lễ hội / sự kiện mẹ cấp trường" optional>
              <Select
                value={form.parentEventId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    parentEventId: e.target.value,
                    boothCode: e.target.value ? f.boothCode : "",
                  }))
                }
              >
                <option value="">Sự kiện độc lập / Sự kiện mẹ</option>
                {parentOptions.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.clubCode ? `[${ev.clubCode}] ` : ""}
                    {ev.title}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Mã vị trí gian hàng (Booth)"
              optional
              hint={form.parentEventId ? "Tự động kiểm tra chống trùng ô gian hàng" : "Chọn sự kiện mẹ để nhập mã gian"}
            >
              <Input
                value={form.boothCode}
                maxLength={32}
                disabled={!form.parentEventId}
                onChange={(e) => setForm((f) => ({ ...f, boothCode: e.target.value }))}
                placeholder="VD: B02, Khu Văn hóa A1…"
              />
            </FormField>
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={form.allowShuttleBus}
              onChange={(e) => setForm((f) => ({ ...f, allowShuttleBus: e.target.checked }))}
            />
            <span className="leading-snug">
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Bus size={13} className="text-primary" /> Mở đăng ký xe bus đưa đón Mỹ Đình ↔ Hòa Lạc
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Sinh viên tích chọn đi xe bus ngay khi đăng ký sự kiện; hệ thống tự tổng hợp cột xuất Excel/A4.
              </span>
            </span>
          </label>

          <FormField label="Đường dẫn ảnh Bản đồ chơi / Sơ đồ gian hàng" optional>
            <div className="relative">
              <MapIcon size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={form.venueMapUrl}
                maxLength={500}
                onChange={(e) => setForm((f) => ({ ...f, venueMapUrl: e.target.value }))}
                placeholder="https://... (ảnh sơ đồ phân khu gian hàng)"
                className="pl-8"
              />
            </div>
          </FormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Bài truyền thông trên Facebook" optional>
              <div className="relative">
                <Share2 size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={form.facebookPostUrl}
                  maxLength={500}
                  onChange={(e) => setForm((f) => ({ ...f, facebookPostUrl: e.target.value }))}
                  placeholder="https://www.facebook.com/vnu.vju/..."
                  className="pl-8"
                />
              </div>
            </FormField>

            <FormField label="Link Album ảnh Recap sau sự kiện" optional>
              <Input
                value={form.recapAlbumUrl}
                maxLength={500}
                onChange={(e) => setForm((f) => ({ ...f, recapAlbumUrl: e.target.value }))}
                placeholder="https://... (Album ảnh VJUP / Fanpage)"
              />
            </FormField>
          </div>

          {coHostOptions.length > 0 && (
            <div className="space-y-1.5">
              <p className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Users size={13} className="text-primary" /> Đơn vị / CLB đồng tổ chức ({form.coHostClubIds.length})
              </p>
              <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border bg-card p-2">
                {coHostOptions.map((c) => {
                  const active = form.coHostClubIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCoHost(c.id)}
                      className={cn(
                        "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {c.code ? `${c.code} · ${c.name}` : c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {form.coHostClubIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <Badge tone="primary" dot={false}>
                Đồng tổ chức cùng {form.coHostClubIds.length} đơn vị
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
