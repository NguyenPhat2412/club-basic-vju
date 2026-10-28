"use client";
import { useMemo, useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Compass, FileText, Mail, Paperclip, Send, Trash2, Upload } from "lucide-react";
import { apiModel, Club } from "@/lib/api";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { ApplicationFilesList, CustomFieldsInputs, formatBytes } from "@/components/shared/ApplicationFileView";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DetailList, EntityDrawer, Section } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";

const LIMIT = 20;

type PendingAttachment = {
  file: File;
  category: string;
};

const EMPTY_DRAFT = {
  preferredDepartmentId: "",
  secondaryDepartmentId: "",
  applicantPhone: "",
  facultyMajor: "",
  academicYear: "",
  gpa: "",
  socialPortfolioUrl: "",
  selfIntroduction: "",
  skillsExperience: "",
  availability: "",
  message: "",
};

function inferApplicantCategory(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "APPLICANT_DOC";
  if (lower.endsWith(".pdf")) return "APPLICANT_CV_PDF";
  return "APPLICANT_IMAGE";
}

export default function ClubsPage() {
  const router = useRouter();
  const session = useOptionalSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Club | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [customAnswers, setCustomAnswers] = useState<Record<string, unknown>>({});
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [notice, setNotice] = useState("");
  const [now] = useState(() => Date.now());

  const canViewPrivateClubs = !!session.user && session.can("club.view");
  const clubs = useQuery({
    queryKey: ["clubs", canViewPrivateClubs ? "private" : "public", search, offset],
    queryFn: () =>
      canViewPrivateClubs
        ? apiModel.clubs(search, "", offset, LIMIT)
        : apiModel.publicClubs(search, "", offset, LIMIT),
    placeholderData: keepPreviousData,
    enabled: session.settled,
  });

  const activeForm = useQuery({
    queryKey: ["club-application-form", selected?.id],
    queryFn: () => apiModel.clubApplicationForm(selected!.id),
    enabled: !!selected && !!session.user,
  });

  const apply = useMutation({
    mutationFn: async () => {
      const formData = activeForm.data;
      if (formData?.requireAttachment && attachments.length === 0) {
        throw new Error("Biểu mẫu của CLB này yêu cầu đính kèm ít nhất 1 tệp hồ sơ (.docx, .pdf hoặc hình ảnh).");
      }
      const created = await apiModel.apply(selected!.id, {
        formId: formData?.id || undefined,
        preferredDepartmentId: draft.preferredDepartmentId || undefined,
        secondaryDepartmentId: draft.secondaryDepartmentId || undefined,
        applicantPhone: draft.applicantPhone || undefined,
        facultyMajor: draft.facultyMajor || undefined,
        academicYear: draft.academicYear || undefined,
        gpa: draft.gpa || undefined,
        socialPortfolioUrl: draft.socialPortfolioUrl || undefined,
        selfIntroduction: draft.selfIntroduction || undefined,
        skillsExperience: draft.skillsExperience || undefined,
        availability: draft.availability || undefined,
        message: draft.message,
        customAnswers,
      });
      for (const item of attachments) {
        await apiModel.uploadApplicationFile(created.id, item.file, item.category);
      }
      return created;
    },
    onSuccess: () => {
      setNotice(`Đã gửi đơn đăng ký vào ${selected!.name}${attachments.length ? ` kèm ${attachments.length} tệp đính kèm` : ""}. Theo dõi hoặc chỉnh sửa tại "Đơn đăng ký của tôi".`);
      setDraft(EMPTY_DRAFT);
      setCustomAnswers({});
      setAttachments([]);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });

  const loadedClubs = clubs.data?.items;
  const filteredItems = useMemo(() => {
    const items = loadedClubs ?? [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((club) => [club.name, club.code, club.activityField, club.description, club.contactEmail].join(" ").toLowerCase().includes(q));
  }, [loadedClubs, search]);

  const open = (club: Club) => {
    setSelected(club);
    setDraft({
      ...EMPTY_DRAFT,
      applicantPhone: session.user?.phone || "",
    });
    setCustomAnswers({});
    setAttachments([]);
    apply.reset();
  };

  const setField = (key: keyof typeof EMPTY_DRAFT) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setDraft((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const maxCount = activeForm.data?.maxAttachments ?? 5;
    setAttachments((prev) => {
      const next = [...prev];
      for (const file of files) {
        if (next.length >= maxCount) break;
        next.push({ file, category: inferApplicantCategory(file.name) });
      }
      return next;
    });
    e.target.value = "";
  };

  const formInfo = activeForm.data;
  const departments = formInfo?.departments ?? [];
  const opensAt = formInfo?.openAt && new Date(formInfo.openAt).getTime() > now ? formInfo.openAt : undefined;
  const formClosed = !!formInfo && (formInfo.status !== "OPEN" || (!!formInfo.closeAt && new Date(formInfo.closeAt).getTime() <= now));

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <BreadcrumbToolbar
        crumbs={[
          { label: "Tổng quan", href: "/dashboard" },
          { label: "Cổng cá nhân" },
          { label: "Khám phá câu lạc bộ" },
        ]}
        titleBadge={<CountBadge>{clubs.data?.total ?? filteredItems.length} CLB</CountBadge>}
        search={{ value: search, onChange: setSearch, placeholder: "Tìm tên, mã CLB, lĩnh vực…" }}
        onRefresh={() => clubs.refetch()}
      />
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-5 sm:px-6">
        <p className="text-sm text-slate-600">Chọn câu lạc bộ phù hợp và nộp đơn trực tuyến.</p>

        {notice && (
          <div className="rounded-lg border border-primary/20 bg-primary/8 px-4 py-3 text-xs font-medium text-primary">
            {notice}
          </div>
        )}

        {!session.user && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Bạn đang xem danh sách câu lạc bộ công khai. Vui lòng đăng nhập để gửi đơn gia nhập CLB.
          </div>
        )}

        {clubs.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : clubs.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {describeError(clubs.error)}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Không tìm thấy câu lạc bộ phù hợp với từ khoá hiện tại.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((club) => (
              <article
                key={club.id}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:border-primary/35 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base font-extrabold text-primary">
                        {club.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{club.code}</p>
                        <h3 className="mt-0.5 truncate text-base font-bold tracking-tight text-slate-900">{club.name}</h3>
                      </div>
                    </div>
                    <StatusBadge status={club.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {club.activityField && (
                      <Badge tone="primary" dot={false}>{club.activityField}</Badge>
                    )}
                    {club.contactEmail && (
                      <Badge tone="neutral" dot={false}>Có email liên hệ</Badge>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-600">
                    {club.description || "CLB đang cập nhật mô tả hoạt động."}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Building2 size={13} className="shrink-0 text-primary" />
                      <span className="truncate">{club.activityField || "Lĩnh vực chung"}</span>
                    </div>
                    {club.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="shrink-0 text-primary" />
                        <span className="truncate">{club.contactEmail}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => open(club)}>
                      Xem chi tiết
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => (session.user ? open(club) : router.push("/login"))}
                      disabled={club.status !== "ACTIVE"}
                    >
                      {session.user ? "Đăng ký gia nhập" : "Đăng nhập"}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {clubs.data && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-2xs">
            <span>Hiển thị {Math.min(filteredItems.length, clubs.data.total)} / {clubs.data.total} CLB</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOffset((prev) => Math.max(0, prev - LIMIT))} disabled={offset === 0}>
                Trước
              </Button>
              <Button size="sm" onClick={() => setOffset((prev) => prev + LIMIT)} disabled={offset + LIMIT >= clubs.data.total}>
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      <EntityDrawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ""} subtitle={selected?.code} icon={<Compass />}>
        {selected && (
          <>
            <DetailList rows={[
              ["Mã CLB", <span key="code" className="font-mono font-semibold text-primary">{selected.code}</span>],
              ["Trạng thái", <StatusBadge key="status" status={selected.status} />],
              ["Lĩnh vực", selected.activityField || "—"],
              ["Liên hệ", selected.contactEmail ? <a key="mail" className="inline-flex items-center gap-1 text-primary hover:underline" href={`mailto:${selected.contactEmail}`}><Mail size={13} /> {selected.contactEmail}</a> : "—"],
              ["Giới thiệu", <p key="desc" className="whitespace-pre-line text-muted-foreground">{selected.description || "CLB đang cập nhật giới thiệu."}</p>],
            ]} />

            {formInfo && formInfo.templateFiles && formInfo.templateFiles.length > 0 && (
              <Section title="Biểu mẫu mẫu & Tài liệu hướng dẫn của CLB" icon={<FileText />}>
                <p className="text-xs text-muted-foreground">
                  Tải xuống mẫu đơn đăng ký (.doc/.docx, .pdf) hoặc xem poster hướng dẫn của CLB trước khi nộp đơn:
                </p>
                <ApplicationFilesList files={formInfo.templateFiles} />
              </Section>
            )}

            <Section title={formInfo?.title || "Biểu mẫu Đơn đăng ký gia nhập CLB"} icon={<Send />}>
              {!session.user ? (
                <div className="grid gap-3">
                  <p className="text-sm text-muted-foreground">Đăng nhập để điền biểu mẫu và gửi đơn tham gia câu lạc bộ này.</p>
                  <Button onClick={() => router.push("/login")}>Đăng nhập để tiếp tục</Button>
                </div>
              ) : selected.status !== "ACTIVE" ? (
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

                  {/* 1. Thông tin liên hệ & Học vấn */}
                  <div className="grid gap-3 rounded-lg border border-border/70 p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">1. Thông tin cá nhân & Học vấn</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="Họ và tên">
                        <Input value={session.user.fullName || session.user.email} disabled />
                      </FormField>
                      <FormField label="Mã sinh viên">
                        <Input value={session.user.studentCode || "Chưa cập nhật"} disabled />
                      </FormField>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="Số điện thoại liên hệ" required>
                        <Input value={draft.applicantPhone} onChange={setField("applicantPhone")} placeholder="VD: 0912345678" />
                      </FormField>
                      <FormField label="Khoa / Ngành học" required>
                        <Input value={draft.facultyMajor} onChange={setField("facultyMajor")} placeholder="VD: CNTT (BCSE), Nhật Bản học (BJS)..." />
                      </FormField>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <FormField label="Khóa / Năm học" required>
                        <Input value={draft.academicYear} onChange={setField("academicYear")} placeholder="VD: K8 - Năm 3" />
                      </FormField>
                      <FormField label="Điểm GPA (tuỳ chọn)">
                        <Input value={draft.gpa} onChange={setField("gpa")} placeholder="VD: 3.5 / 4.0" />
                      </FormField>
                      <FormField label="Link FB / Portfolio">
                        <Input value={draft.socialPortfolioUrl} onChange={setField("socialPortfolioUrl")} placeholder="https://..." />
                      </FormField>
                    </div>
                  </div>

                  {/* 2. Nguyện vọng Phân ban */}
                  {departments.length > 0 && (
                    <div className="grid gap-3 rounded-lg border border-border/70 p-3.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">2. Nguyện vọng Phân ban</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormField label="Ban nguyện vọng 1">
                          <Select value={draft.preferredDepartmentId} onChange={setField("preferredDepartmentId")}>
                            <option value="">— Chọn Ban nguyện vọng 1 —</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </Select>
                        </FormField>
                        <FormField label="Ban nguyện vọng 2 (tuỳ chọn)">
                          <Select value={draft.secondaryDepartmentId} onChange={setField("secondaryDepartmentId")}>
                            <option value="">— Chọn Ban nguyện vọng 2 —</option>
                            {departments.filter((d) => d.id !== draft.preferredDepartmentId).map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </Select>
                        </FormField>
                      </div>
                    </div>
                  )}

                  {/* 3. Hồ sơ năng lực & Động lực */}
                  <div className="grid gap-3 rounded-lg border border-border/70 p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">3. Giới thiệu, Kỹ năng & Lý do ứng tuyển</p>
                    <FormField label="Giới thiệu bản thân & Tính cách">
                      <Textarea rows={2} maxLength={2000} value={draft.selfIntroduction} onChange={setField("selfIntroduction")} placeholder="Giới thiệu ngắn gọn về bản thân, sở thích, điểm mạnh/điểm yếu..." />
                    </FormField>
                    <FormField label="Kỹ năng chuyên môn & Kinh nghiệm hoạt động">
                      <Textarea rows={2} maxLength={2000} value={draft.skillsExperience} onChange={setField("skillsExperience")} placeholder="VD: Thiết kế Canva/Photoshop, tổ chức sự kiện, lập trình, ngoại ngữ..." />
                    </FormField>
                    <FormField label="Thời gian có thể tham gia hoạt động trong tuần">
                      <Input maxLength={500} value={draft.availability} onChange={setField("availability")} placeholder="VD: Các buổi tối trong tuần và cuối tuần (8–10h/tuần)" />
                    </FormField>
                    <FormField label="Lý do & Động lực muốn gia nhập CLB" required>
                      <Textarea rows={3} maxLength={2000} value={draft.message} onChange={setField("message")} placeholder="Chia sẻ lý do bạn muốn gia nhập CLB và mong muốn đóng góp…" aria-label="Lời nhắn" />
                    </FormField>
                  </div>

                  {/* 4. Câu hỏi tuỳ chỉnh của CLB */}
                  {formInfo?.fields && formInfo.fields.length > 0 && (
                    <CustomFieldsInputs
                      fields={formInfo.fields}
                      values={customAnswers}
                      onChange={(k, v) => setCustomAnswers((prev) => ({ ...prev, [k]: v }))}
                    />
                  )}

                  {/* 5. Đính kèm file Docs / PDF / Hình ảnh */}
                  {(formInfo?.allowAttachments ?? true) && (
                    <div className="grid gap-3 rounded-lg border border-dashed border-primary/35 bg-primary/[0.02] p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                            <Paperclip size={13} /> Đính kèm Đơn Word (.doc/.docx), CV (.pdf) & Hình ảnh
                            {formInfo?.requireAttachment && <Badge tone="danger" dot={false}>Bắt buộc</Badge>}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Hỗ trợ: <b>.doc, .docx, .pdf, .png, .jpg, .webp</b> (tối đa {formInfo?.maxAttachments ?? 5} tệp, mỗi tệp ≤ 20MB).
                          </p>
                        </div>
                        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:opacity-95">
                          <Upload size={13} /> Chọn tệp ({attachments.length}/{formInfo?.maxAttachments ?? 5})
                          <input
                            type="file"
                            multiple
                            accept=".doc,.docx,.pdf,.png,.jpg,.jpeg,.gif,.webp"
                            className="hidden"
                            onChange={handleSelectFiles}
                          />
                        </label>
                      </div>

                      {attachments.length > 0 && (
                        <div className="grid gap-2">
                          {attachments.map((item, idx) => (
                            <div key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold">{item.file.name}</p>
                                <p className="text-[11px] text-muted-foreground">{formatBytes(item.file.size)}</p>
                              </div>
                              <Select
                                value={item.category}
                                onChange={(e) =>
                                  setAttachments((prev) =>
                                    prev.map((x, i) => (i === idx ? { ...x, category: e.target.value } : x))
                                  )
                                }
                                className="h-7 w-44 text-[11px]"
                              >
                                <option value="APPLICANT_DOC">Đơn đăng ký (.doc/.docx)</option>
                                <option value="APPLICANT_CV_PDF">CV / Hồ sơ (.pdf)</option>
                                <option value="APPLICANT_IMAGE">Hình ảnh minh chứng</option>
                                <option value="APPLICANT_ATTACHMENT">Tệp đính kèm khác</option>
                              </Select>
                              <button
                                type="button"
                                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {apply.error && <p className="text-xs text-destructive">{describeError(apply.error)}</p>}
                  <Button
                    className="justify-self-end text-xs font-bold"
                    disabled={!draft.message.trim() || apply.isPending}
                    onClick={() => apply.mutate()}
                  >
                    <Send size={14} /> {apply.isPending ? "Đang gửi đơn & tải tệp…" : "Nộp đơn đăng ký"}
                  </Button>
                </div>
              )}
            </Section>
          </>
        )}
      </EntityDrawer>
    </div>
  );
}
