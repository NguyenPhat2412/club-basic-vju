"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, FileText, LogIn, Send, UserPlus } from "lucide-react";
import { apiModel } from "@/lib/api";
import { isYouthUnion, unitApplyCtaLabel, unitBadgeLabel } from "@/lib/club/youth-union";
import { qk } from "@/lib/api/query-keys";
import { clubSlugFromCode } from "@/lib/media";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { ClubAvatar, useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { ApplicationFilesList, CustomFieldsInputs } from "@/components/shared/ApplicationFileView";
import {
  ApplicationAttachmentPicker,
  ApplicationDraftFormFields,
  PendingApplicationAttachment,
} from "@/components/shared/ApplicationFormFields";
import { describeError } from "@/components/shared/ListPage";
import { EmptyState, LoadingRows } from "@/components/shared/States";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { formatDateTime, validateApplicationFile } from "@/lib/utils";
import {
  buildApplicationSubmitPayload,
  ClubApplicationDraft,
  EMPTY_APPLICATION_DRAFT,
  inferApplicantCategory,
} from "@/forms/application/application-form";

export function ClubApplyView({ clubId }: { clubId: string }) {
  const router = useRouter();
  const session = useOptionalSession();
  const queryClient = useQueryClient();
  const [now] = useState(() => Date.now());
  const [draft, setDraft] = useState<ClubApplicationDraft>(EMPTY_APPLICATION_DRAFT);
  const [phoneEdited, setPhoneEdited] = useState(false);
  const [customAnswers, setCustomAnswers] = useState<Record<string, unknown>>({});
  const [attachments, setAttachments] = useState<PendingApplicationAttachment[]>([]);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

  const mediaCatalog = useClubMediaCatalog(true);
  const clubQuery = useQuery({
    queryKey: qk.publicClubDetail(clubId),
    queryFn: () => apiModel.publicClub(clubId),
    enabled: Boolean(clubId),
  });
  const formQuery = useQuery({
    queryKey: qk.clubApplicationForm(clubId),
    queryFn: () => apiModel.clubApplicationForm(clubId),
    enabled: Boolean(clubId && session.user),
  });
  const myMemberships = useQuery({
    queryKey: qk.myMemberships("apply", clubId),
    queryFn: () => apiModel.myMemberships({ limit: 100 }),
    enabled: Boolean(session.user),
  });
  const myApplications = useQuery({
    queryKey: qk.myApplications("apply", clubId),
    queryFn: () => apiModel.myApplications({ limit: 100 }),
    enabled: Boolean(session.user),
  });

  const effectiveDraft: ClubApplicationDraft =
    !phoneEdited && !draft.applicantPhone && session.user?.phone
      ? { ...draft, applicantPhone: session.user.phone }
      : draft;

  const onDraftChange = <K extends keyof ClubApplicationDraft>(key: K, value: ClubApplicationDraft[K]) => {
    if (key === "applicantPhone") setPhoneEdited(true);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const maxCount = formQuery.data?.maxAttachments ?? 5;
    const valid = files.filter((file) => {
      const err = validateApplicationFile(file);
      if (err) toast.error(err);
      return !err;
    });
    if (!valid.length) return;
    setAttachments((prev) => [
      ...prev,
      ...valid.slice(0, Math.max(0, maxCount - prev.length)).map((file) => ({
        file,
        category: inferApplicantCategory(file.name),
      })),
    ]);
  };

  const applyMutation = useMutation({
    mutationFn: async () => {
      const formInfo = formQuery.data;
      if (!effectiveDraft.applicantPhone.trim() || !effectiveDraft.facultyMajor.trim() || !effectiveDraft.academicYear.trim()) {
        throw new Error("Vui lòng điền đầy đủ Số điện thoại liên hệ, Khoa / Ngành học và Khóa / Năm học.");
      }
      for (const field of formInfo?.fields ?? []) {
        if (field.required && !String(customAnswers[field.key] ?? "").trim()) {
          throw new Error(`Vui lòng trả lời câu hỏi bắt buộc: ${field.label || field.key}.`);
        }
      }
      if (formInfo?.requireAttachment && attachments.length === 0) {
        throw new Error("Biểu mẫu của CLB này yêu cầu đính kèm ít nhất 1 tệp hồ sơ (.docx, .pdf hoặc hình ảnh).");
      }
      const created = await apiModel.apply(clubId, buildApplicationSubmitPayload(effectiveDraft, customAnswers, formInfo?.id));
      for (const item of attachments) {
        await apiModel.uploadApplicationFile(created.id, item.file, item.category);
      }
      return created;
    },
    onSuccess: (created) => {
      setSubmittedAppId(created.id);
      setDraft(EMPTY_APPLICATION_DRAFT);
      setCustomAnswers({});
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: qk.myApplications() });
      queryClient.invalidateQueries({ queryKey: qk.dashboard("my-applications") });
    },
  });

  if (clubQuery.isPending) {
    return <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6"><LoadingRows /></div>;
  }

  if (clubQuery.isError || !clubQuery.data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <EmptyState
            icon={<Send />}
            title="Không tìm thấy Câu lạc bộ"
            description={clubQuery.isError ? describeError(clubQuery.error) : "CLB không tồn tại hoặc đã ngừng hoạt động."}
          />
          <div className="mt-4 flex justify-center">
            <Link href="/clubs" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 text-xs font-semibold text-foreground hover:bg-muted">
              <ArrowLeft size={14} /> Quay lại danh sách CLB
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const club = clubQuery.data;
  const isDtn = isYouthUnion(club);
  const applyCta = unitApplyCtaLabel(club.code);
  const media = mediaCatalog.data?.clubs[clubSlugFromCode(club.code)];
  const formInfo = formQuery.data;
  const departments = formInfo?.departments ?? [];
  const membership = (myMemberships.data?.items ?? []).find(
    (m) => m.clubId === club.id && (m.status === "ACTIVE" || m.status === "SUSPENDED"),
  );
  const pendingApp = (myApplications.data?.items ?? []).find(
    (a) => a.clubId === club.id && a.status === "PENDING",
  );
  const opensAt = formInfo?.openAt && new Date(formInfo.openAt).getTime() > now ? formInfo.openAt : undefined;
  const formClosed =
    Boolean(formInfo) &&
    (formInfo?.status !== "OPEN" || (Boolean(formInfo?.closeAt) && new Date(formInfo!.closeAt!).getTime() <= now));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/clubs/${club.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
          <ArrowLeft size={14} /> {isDtn ? "Quay lại Trang Đoàn Trường" : "Quay lại Portfolio CLB"}
        </Link>
        <Link href="/clubs" className="inline-flex h-9 items-center rounded-lg border border-border/70 bg-background px-3 text-xs font-medium text-muted-foreground hover:text-foreground">
          {isDtn ? "Danh sách Đoàn & CLB" : "Khám phá CLB khác"}
        </Link>
      </div>

      <header className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <ClubAvatar name={club.name} code={club.code} logoUrl={club.logoUrl} fallbackUrl={media?.logo} size="md" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-extrabold text-primary">{club.code}</code>
                {isDtn && <Badge tone="primary" dot={false}>{unitBadgeLabel(club.code)}</Badge>}
                {club.activityField && <span className="text-xs text-muted-foreground">{club.activityField}</span>}
              </div>
              <h1 className="mt-1 text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
                {formInfo?.title || (isDtn ? applyCta : `Ứng tuyển gia nhập ${club.name}`)}
              </h1>
            </div>
          </div>
          {formInfo ? <StatusBadge status={formInfo.status} /> : <StatusBadge status={club.status} />}
        </div>

        {(formInfo?.openAt || formInfo?.closeAt) && (
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/70 bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
            {formInfo.openAt && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock size={14} className="text-primary" /> Mở đơn: <b className="text-foreground">{formatDateTime(formInfo.openAt)}</b>
              </span>
            )}
            {formInfo.closeAt && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={14} className="text-primary" /> Hạn chót: <b className="text-foreground">{formatDateTime(formInfo.closeAt)}</b>
              </span>
            )}
          </div>
        )}

        {formInfo?.description && (
          <p className="whitespace-pre-line rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-relaxed text-foreground">
            {formInfo.description}
          </p>
        )}

        {departments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Các ban chuyên môn đang tuyển</p>
            <div className="flex flex-wrap gap-1.5">
              {departments.map((d) => <Badge key={d.id} tone="neutral" dot={false}>{d.name}</Badge>)}
            </div>
          </div>
        )}

        {formInfo?.templateFiles && formInfo.templateFiles.length > 0 && (
          <div className="space-y-2 border-t border-border/60 pt-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <FileText size={14} /> Tài liệu mô tả công việc (JD) & Biểu mẫu hướng dẫn
            </p>
            <ApplicationFilesList files={formInfo.templateFiles} />
          </div>
        )}
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
        {session.settled && !session.user ? (
          <div className="space-y-4 py-2 text-center">
            <p className="text-sm font-bold text-foreground">Đăng nhập để tải JD và điền biểu mẫu ứng tuyển trực tuyến</p>
            <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
              Hệ thống tự động điền họ tên, mã sinh viên từ tài khoản VJU ClubHub của bạn và lưu tiến độ xét duyệt.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              <Button onClick={() => router.push(`/clubs/${club.id}/apply?auth=login`)}><LogIn size={14} /> Đăng nhập ngay</Button>
              <Button variant="outline" onClick={() => router.push(`/clubs/${club.id}/apply?auth=register`)}><UserPlus size={14} /> Tạo tài khoản sinh viên</Button>
            </div>
          </div>
        ) : formQuery.isPending ? (
          <LoadingRows />
        ) : submittedAppId ? (
          <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-primary">
              <CheckCircle2 size={16} /> Đã gửi đơn ứng tuyển vào {club.name} thành công!
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Bạn có thể xem lại đơn, bổ sung tệp đính kèm hoặc theo dõi kết quả xét duyệt từ Ban Chủ nhiệm.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => router.push(`/applications?applicationId=${submittedAppId}`)}>Xem & theo dõi đơn đăng ký</Button>
              <Link href={`/clubs/${club.id}`} className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted">
                {isDtn ? "Quay lại Trang Đoàn Trường" : "Quay lại Portfolio CLB"}
              </Link>
            </div>
          </div>
        ) : membership ? (
          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-5 text-sm">
            <p className="font-bold text-foreground">
              {membership.status === "SUSPENDED"
                ? `Tư cách thành viên của bạn tại ${isDtn ? "Đoàn Trường" : "CLB này"} đang ở trạng thái tạm đình chỉ.`
                : isDtn
                  ? "Bạn đã là thành viên / cán bộ chính thức của Đoàn Thanh niên Trường."
                  : "Bạn đã là thành viên chính thức của câu lạc bộ này."}
            </p>
            <Button size="sm" onClick={() => router.push("/memberships")}>Xem tại CLB đã tham gia</Button>
          </div>
        ) : pendingApp ? (
          <div className="space-y-3 rounded-xl border border-primary/25 bg-accent/60 p-5 text-sm text-foreground">
            <p className="font-bold">Bạn đang có một đơn đăng ký chờ xét duyệt tại {isDtn ? "Đoàn Thanh niên Trường" : "câu lạc bộ này"}.</p>
            <p className="text-xs text-muted-foreground">
              Ngày gửi: {formatDateTime(pendingApp.createdAt)}. Bạn có thể xem chi tiết, bổ sung tệp hoặc rút đơn trước khi đơn vị xét duyệt.
            </p>
            <Button size="sm" onClick={() => router.push(`/applications?applicationId=${pendingApp.id}`)}>Xem & theo dõi đơn đăng ký</Button>
          </div>
        ) : club.status !== "ACTIVE" ? (
          <p className="text-sm text-muted-foreground">{isDtn ? "Đoàn Trường" : "CLB"} hiện đang tạm ngừng nhận hồ sơ.</p>
        ) : formClosed || opensAt ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {opensAt && !formClosed
              ? `${isDtn ? "Đoàn Trường" : "CLB"} bắt đầu nhận đơn từ ${formatDateTime(opensAt)}.`
              : `Đợt nhận đơn đăng ký của ${isDtn ? "Đoàn Trường" : "CLB"} hiện đang đóng. Vui lòng quay lại vào đợt tuyển tiếp theo.`}
          </div>
        ) : (
          <div className="grid gap-5">
            <div className="border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground">
                {isDtn ? "Biểu mẫu đăng ký Ban / CTV Đoàn Trường" : "Biểu mẫu ứng tuyển thành viên"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isDtn
                  ? "Điền đầy đủ thông tin bên dưới để Ban Chấp hành Đoàn Trường xem xét và sắp xếp lịch phỏng vấn."
                  : "Điền đầy đủ thông tin bên dưới để Ban Chủ nhiệm xem xét và sắp xếp lịch phỏng vấn."}
              </p>
            </div>

            <ApplicationDraftFormFields
              values={effectiveDraft}
              onChange={onDraftChange}
              departments={departments}
              applicantIdentity={
                session.user
                  ? { fullName: session.user.fullName, email: session.user.email, studentCode: session.user.studentCode }
                  : undefined
              }
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

            {applyMutation.isError && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
                {describeError(applyMutation.error)}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border/60 pt-4">
              <Link href={`/clubs/${club.id}`} className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-muted">
                Huỷ
              </Link>
              <Button className="h-10 px-5 text-xs font-extrabold" disabled={!effectiveDraft.message.trim() || applyMutation.isPending} onClick={() => applyMutation.mutate()}>
                <Send size={14} /> {applyMutation.isPending ? "Đang gửi đơn & tải tệp…" : isDtn ? applyCta : "Nộp đơn đăng ký"}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
