"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  Images,
  Mail,
  Send,
  X,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { ClubMediaItem } from "@/lib/media";
import { ApplicationFilesList, CustomFieldsInputs } from "@/components/shared/ApplicationFileView";
import {
  ApplicationAttachmentPicker,
  ApplicationDraftFormFields,
  PendingApplicationAttachment,
} from "@/components/shared/ApplicationFormFields";
import { ClubAvatar, ClubCoverBanner } from "@/components/shared/ClubMedia";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ApplicationSummary,
  ClubApplicationForm,
  ClubItem,
  Membership,
  SessionUser,
} from "@/types";
import { ClubApplicationDraft } from "@/forms/application/application-form";

export type PendingAttachment = PendingApplicationAttachment;

interface ClubRecruitmentDrawerProps {
  activeSelected: ClubItem | null;
  closeDrawer: () => void;
  selectedMedia?: ClubMediaItem;
  selectedGallery: string[];
  lightboxIdx: number | null;
  setLightboxIdx: React.Dispatch<React.SetStateAction<number | null>>;
  user?: SessionUser;
  selectedMembership?: Membership;
  selectedPendingApp?: ApplicationSummary;
  formInfo?: ClubApplicationForm;
  now: number;
  draft: ClubApplicationDraft;
  onDraftChange: <K extends keyof ClubApplicationDraft>(key: K, value: ClubApplicationDraft[K]) => void;
  customAnswers: Record<string, unknown>;
  setCustomAnswers: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  attachments: PendingAttachment[];
  setAttachments: React.Dispatch<React.SetStateAction<PendingAttachment[]>>;
  handleSelectFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  applyPending: boolean;
  applyError: unknown;
  onApply: () => void;
}

export function ClubRecruitmentDrawer({
  activeSelected,
  closeDrawer,
  selectedMedia,
  selectedGallery,
  lightboxIdx,
  setLightboxIdx,
  user,
  selectedMembership,
  selectedPendingApp,
  formInfo,
  now,
  draft,
  onDraftChange,
  customAnswers,
  setCustomAnswers,
  attachments,
  setAttachments,
  handleSelectFiles,
  applyPending,
  applyError,
  onApply,
}: ClubRecruitmentDrawerProps) {
  const router = useRouter();
  const departments = formInfo?.departments ?? [];
  const opensAt = formInfo?.openAt && new Date(formInfo.openAt).getTime() > now ? formInfo.openAt : undefined;
  const formClosed =
    !!formInfo && (formInfo.status !== "OPEN" || (!!formInfo.closeAt && new Date(formInfo.closeAt).getTime() <= now));

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight" && selectedGallery.length > 0) {
        setLightboxIdx((prev) => (prev === null ? null : (prev + 1) % selectedGallery.length));
      }
      if (e.key === "ArrowLeft" && selectedGallery.length > 0) {
        setLightboxIdx((prev) =>
          prev === null ? null : (prev - 1 + selectedGallery.length) % selectedGallery.length,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, selectedGallery.length, setLightboxIdx]);

  return (
    <>
      <EntityDrawer
        open={!!activeSelected}
        onClose={closeDrawer}
        title={activeSelected?.name ?? ""}
        subtitle={activeSelected?.code}
        icon={<Compass />}
      >
        {activeSelected && (
          <>
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
              <ClubCoverBanner
                name={activeSelected.name}
                code={activeSelected.code}
                coverUrl={activeSelected.coverUrl}
                fallbackUrl={selectedMedia?.cover}
                className="h-44 w-full"
              >
                <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ClubAvatar
                      name={activeSelected.name}
                      code={activeSelected.code}
                      logoUrl={activeSelected.logoUrl}
                      fallbackUrl={selectedMedia?.logo}
                      size="lg"
                    />
                    <div className="min-w-0 text-white drop-shadow-xs">
                      <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-white/85">
                        {activeSelected.code}
                      </p>
                      <p className="line-clamp-1 text-base font-extrabold">{activeSelected.name}</p>
                    </div>
                  </div>
                  <StatusBadge status={activeSelected.status} />
                </div>
              </ClubCoverBanner>
            </div>

            <DetailList
              rows={[
                ["Mã CLB", <span key="code" className="font-mono font-semibold text-primary">{activeSelected.code}</span>],
                ["Lĩnh vực", activeSelected.activityField || "—"],
                [
                  "Liên hệ",
                  activeSelected.contactEmail ? (
                    <a
                      key="mail"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                      href={`mailto:${activeSelected.contactEmail}`}
                    >
                      <Mail size={13} /> {activeSelected.contactEmail}
                    </a>
                  ) : (
                    "—"
                  ),
                ],
                [
                  "Giới thiệu",
                  <p key="desc" className="whitespace-pre-line leading-6 text-muted-foreground">
                    {activeSelected.description || "CLB đang cập nhật giới thiệu."}
                  </p>,
                ],
              ]}
            />

            {selectedGallery.length > 0 && (
              <Section title={`Hình ảnh hoạt động thực tế (${selectedGallery.length})`} icon={<Images />}>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {selectedGallery.map((imgSrc, idx) => (
                    <button
                      key={imgSrc}
                      type="button"
                      onClick={() => setLightboxIdx(idx)}
                      className="group relative aspect-4/3 overflow-hidden rounded-xl border border-border/70 bg-muted focus:outline-hidden focus:ring-2 focus:ring-primary"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgSrc}
                        alt={`${activeSelected.name} — Ảnh hoạt động ${idx + 1}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {formInfo && formInfo.templateFiles && formInfo.templateFiles.length > 0 && (
              <Section title="Biểu mẫu mẫu & Tài liệu hướng dẫn của CLB" icon={<FileText />}>
                <p className="text-xs text-muted-foreground">
                  Tải xuống mẫu đơn đăng ký (.doc/.docx, .pdf) hoặc xem poster hướng dẫn của CLB trước khi nộp đơn:
                </p>
                <ApplicationFilesList files={formInfo.templateFiles} />
              </Section>
            )}

            <Section title={formInfo?.title || "Biểu mẫu Đơn đăng ký gia nhập CLB"} icon={<Send />}>
              {!user ? (
                <div className="grid gap-3">
                  <p className="text-sm text-muted-foreground">Đăng nhập để điền biểu mẫu và gửi đơn tham gia câu lạc bộ này.</p>
                  <Button onClick={() => router.push("/clubs?auth=login")}>Đăng nhập để tiếp tục</Button>
                </div>
              ) : selectedMembership ? (
                <div className="grid gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                  <p className="font-semibold text-foreground">
                    {selectedMembership.status === "SUSPENDED"
                      ? "Tư cách thành viên của bạn tại CLB này đang ở trạng thái tạm đình chỉ."
                      : "Bạn đã là thành viên chính thức của câu lạc bộ này."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => router.push("/memberships")}>
                      Xem tại CLB đã tham gia
                    </Button>
                  </div>
                </div>
              ) : selectedPendingApp ? (
                <div className="grid gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">Bạn đang có một đơn đăng ký chờ xét duyệt tại câu lạc bộ này.</p>
                  <p className="text-xs text-amber-800">
                    Ngày gửi: {formatDateTime(selectedPendingApp.createdAt)}. Bạn có thể xem chi tiết, bổ sung tệp hoặc rút đơn trước khi CLB xét duyệt.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => router.push(`/applications?applicationId=${selectedPendingApp.id}`)}>
                      Xem & theo dõi đơn đăng ký
                    </Button>
                  </div>
                </div>
              ) : activeSelected.status !== "ACTIVE" ? (
                <p className="text-sm text-muted-foreground">CLB hiện đang tạm ngừng nhận thành viên.</p>
              ) : formClosed || opensAt ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {opensAt && !formClosed
                    ? `CLB bắt đầu nhận đơn từ ${formatDateTime(opensAt)}.`
                    : "Đợt nhận đơn đăng ký của CLB hiện đang đóng. Vui lòng quay lại vào đợt tuyển tiếp theo."}
                </p>
              ) : (
                <div className="grid gap-4">
                  {formInfo?.description && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs leading-5 text-foreground/90">
                      {formInfo.description}
                    </div>
                  )}

                  <ApplicationDraftFormFields
                    values={draft}
                    onChange={onDraftChange}
                    departments={departments}
                    applicantIdentity={{
                      fullName: user.fullName,
                      email: user.email,
                      studentCode: user.studentCode,
                    }}
                    requireAcademic
                    boxedSections
                  />

                  {formInfo?.fields && formInfo.fields.length > 0 && (
                    <CustomFieldsInputs
                      fields={formInfo.fields}
                      values={customAnswers}
                      onChange={(k, v) => setCustomAnswers((prev) => ({ ...prev, [k]: v }))}
                    />
                  )}

                  {(formInfo?.allowAttachments ?? true) && (
                    <ApplicationAttachmentPicker
                      attachments={attachments}
                      setAttachments={setAttachments}
                      maxAttachments={formInfo?.maxAttachments ?? 5}
                      requireAttachment={formInfo?.requireAttachment}
                      onSelectFiles={handleSelectFiles}
                    />
                  )}

                  {Boolean(applyError) && <p className="text-xs text-destructive">{describeError(applyError)}</p>}
                  <Button
                    className="w-full text-xs font-bold sm:w-auto sm:justify-self-end"
                    disabled={!draft.message.trim() || applyPending}
                    onClick={onApply}
                  >
                    <Send size={14} /> {applyPending ? "Đang gửi đơn & tải tệp…" : "Nộp đơn đăng ký"}
                  </Button>
                </div>
              )}
            </Section>
          </>
        )}
      </EntityDrawer>

      {activeSelected && lightboxIdx !== null && selectedGallery[lightboxIdx] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh hoạt động câu lạc bộ"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/88 p-4 backdrop-blur-xs"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            type="button"
            aria-label="Đóng xem ảnh"
            onClick={() => setLightboxIdx(null)}
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X size={20} />
          </button>
          {selectedGallery.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Ảnh trước"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightboxIdx - 1 + selectedGallery.length) % selectedGallery.length);
                }}
                className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                aria-label="Ảnh tiếp theo"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightboxIdx + 1) % selectedGallery.length);
                }}
                className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <div className="max-h-[86vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedGallery[lightboxIdx]}
              alt={`${activeSelected.name} — Ảnh ${lightboxIdx + 1}`}
              className="max-h-[80vh] w-auto rounded-xl object-contain shadow-2xl"
            />
            <p className="mt-2.5 text-center text-xs font-medium text-white/80">
              {activeSelected.name} · Ảnh {lightboxIdx + 1} / {selectedGallery.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
