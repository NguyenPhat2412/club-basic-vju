import type {
  Application,
  CreateApplicationInput,
  FormFieldDefinition,
  UpdateApplicationInput,
  UpsertApplicationFormInput,
} from '@/types/application/application.types';

export interface ApplicantSubmissionDraft {
  preferredDepartmentId: string;
  secondaryDepartmentId: string;
  applicantPhone: string;
  facultyMajor: string;
  academicYear: string;
  gpa: string;
  socialPortfolioUrl: string;
  selfIntroduction: string;
  skillsExperience: string;
  availability: string;
  message: string;
  customAnswers?: Record<string, unknown>;
}

export type ClubApplicationDraft = ApplicantSubmissionDraft;

export interface AppManageDraft extends ApplicantSubmissionDraft {
  applicantId: string;
  customAnswers: Record<string, unknown>;
  reviewNote: string;
  internalNote: string;
  assignDepartmentId: string;
}

export const EMPTY_APPLICATION_DRAFT: ClubApplicationDraft = {
  preferredDepartmentId: '',
  secondaryDepartmentId: '',
  applicantPhone: '',
  facultyMajor: '',
  academicYear: '',
  gpa: '',
  socialPortfolioUrl: '',
  selfIntroduction: '',
  skillsExperience: '',
  availability: '',
  message: '',
  customAnswers: {},
};

export const EMPTY_APP_DRAFT: AppManageDraft = {
  ...EMPTY_APPLICATION_DRAFT,
  customAnswers: {},
  applicantId: '',
  reviewNote: '',
  internalNote: '',
  assignDepartmentId: '',
};

export const EMPTY_FORM_DRAFT: UpsertApplicationFormInput = {
  title: 'Biểu mẫu đăng ký gia nhập câu lạc bộ',
  description: '',
  status: 'OPEN',
  requireAttachment: false,
  maxAttachments: 5,
  fields: [],
};

export function emptyApplicantSubmissionDraft(phone = ''): ApplicantSubmissionDraft {
  return {
    ...EMPTY_APPLICATION_DRAFT,
    applicantPhone: phone,
  };
}

export function inferApplicantCategory(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'APPLICANT_DOC';
  if (lower.endsWith('.pdf')) return 'APPLICANT_CV_PDF';
  if (/\.(png|jpe?g|gif|webp)$/.test(lower)) return 'APPLICANT_IMAGE';
  return 'APPLICANT_ATTACHMENT';
}

export function buildApplicationSubmitPayload(
  draft: ClubApplicationDraft,
  customAnswers: Record<string, unknown> = {},
  formId?: string | null
): CreateApplicationInput {
  return toCreateApplicationPayload(
    {
      ...draft,
      customAnswers: Object.keys(customAnswers).length > 0 ? customAnswers : draft.customAnswers,
    },
    formId
  );
}

export function toAppManageDraft(app: Application): AppManageDraft {
  return {
    applicantId: app.applicantId,
    preferredDepartmentId: app.preferredDepartmentId || '',
    secondaryDepartmentId: app.secondaryDepartmentId || '',
    applicantPhone: app.applicantPhone || '',
    facultyMajor: app.facultyMajor || '',
    academicYear: app.academicYear || '',
    gpa: app.gpa || '',
    socialPortfolioUrl: app.socialPortfolioUrl || '',
    selfIntroduction: app.selfIntroduction || '',
    skillsExperience: app.skillsExperience || '',
    availability: app.availability || '',
    message: app.message || '',
    customAnswers: { ...(app.customAnswers ?? {}) },
    reviewNote: app.reviewNote || '',
    internalNote: app.internalNote || '',
    assignDepartmentId: app.preferredDepartmentId || '',
  };
}

export function toCreateApplicationPayload(
  draft: ApplicantSubmissionDraft,
  formId?: string | null,
  applicantId?: string
): CreateApplicationInput {
  const customAnswers = draft.customAnswers ?? {};
  return {
    formId: formId || undefined,
    preferredDepartmentId: draft.preferredDepartmentId || undefined,
    secondaryDepartmentId: draft.secondaryDepartmentId || undefined,
    applicantPhone: draft.applicantPhone.trim() || undefined,
    facultyMajor: draft.facultyMajor.trim() || undefined,
    academicYear: draft.academicYear.trim() || undefined,
    gpa: draft.gpa.trim() || undefined,
    socialPortfolioUrl: draft.socialPortfolioUrl.trim() || undefined,
    selfIntroduction: draft.selfIntroduction.trim() || undefined,
    skillsExperience: draft.skillsExperience.trim() || undefined,
    availability: draft.availability.trim() || undefined,
    message: draft.message.trim() || 'Đơn đăng ký gia nhập câu lạc bộ',
    customAnswers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
    applicantId: applicantId || undefined,
  };
}

export function toUpdateApplicationPayload(
  draft: AppManageDraft,
  isApproved: boolean
): UpdateApplicationInput {
  return {
    preferredDepartmentId: draft.preferredDepartmentId || undefined,
    secondaryDepartmentId: draft.secondaryDepartmentId || undefined,
    applicantPhone: draft.applicantPhone.trim(),
    facultyMajor: draft.facultyMajor.trim(),
    academicYear: draft.academicYear.trim(),
    gpa: draft.gpa.trim(),
    socialPortfolioUrl: draft.socialPortfolioUrl.trim(),
    selfIntroduction: draft.selfIntroduction.trim(),
    skillsExperience: draft.skillsExperience.trim(),
    availability: draft.availability.trim(),
    message: draft.message.trim(),
    customAnswers: draft.customAnswers,
    reviewNote: draft.reviewNote.trim(),
    internalNote: draft.internalNote.trim(),
    assignDepartmentId: isApproved && draft.assignDepartmentId ? draft.assignDepartmentId : undefined,
  };
}

export function startOfDayIso(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

export function endOfDayExclusiveIso(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

export function emptyFormFieldDefinition(index: number): FormFieldDefinition {
  return {
    key: `question_${index}`,
    label: '',
    type: 'TEXT',
    required: false,
    placeholder: '',
    options: [],
  };
}
