export type ApplicationFieldType = 'TEXT' | 'TEXTAREA' | 'SELECT' | 'RADIO' | 'CHECKBOX' | 'NUMBER' | 'DATE' | 'URL';

export type FormFieldDefinition = {
  key: string;
  label: string;
  type: ApplicationFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
};

export type ApplicationFile = {
  id: string;
  clubId: string;
  formId?: string;
  applicationId?: string;
  purpose: 'FORM_TEMPLATE' | 'APPLICANT_ATTACHMENT';
  fileCategory: string;
  originalName: string;
  contentType: string;
  fileType: string;
  sizeBytes: number;
  checksumSha256: string;
  uploadedBy?: string;
  createdAt: string;
};

export type ApplicationForm = {
  id: string | null;
  clubId: string;
  clubCode: string;
  clubName: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  openAt?: string;
  closeAt?: string;
  fields: FormFieldDefinition[];
  allowAttachments: boolean;
  requireAttachment: boolean;
  maxAttachments: number;
  isDefault: boolean;
  templateFiles: ApplicationFile[];
  departments: { id: string; name: string; description?: string }[];
  createdAt?: string;
  updatedAt?: string;
};

export type UpsertApplicationFormInput = {
  title: string;
  description?: string;
  status?: 'DRAFT' | 'OPEN' | 'CLOSED';
  openAt?: string;
  closeAt?: string;
  fields: FormFieldDefinition[];
  allowAttachments?: boolean;
  requireAttachment?: boolean;
  maxAttachments?: number;
  isDefault?: boolean;
};

export type CreateApplicationInput = {
  message: string;
  formId?: string;
  preferredDepartmentId?: string;
  secondaryDepartmentId?: string;
  applicantPhone?: string;
  facultyMajor?: string;
  academicYear?: string;
  gpa?: string;
  socialPortfolioUrl?: string;
  selfIntroduction?: string;
  skillsExperience?: string;
  availability?: string;
  customAnswers?: Record<string, unknown>;
  applicantId?: string;
};

export type ReviewApplicationInput = {
  reviewNote?: string;
  internalNote?: string;
  departmentId?: string;
  skipDepartmentAssignment?: boolean;
};

export type UpdateApplicationInput = {
  preferredDepartmentId?: string;
  secondaryDepartmentId?: string;
  applicantPhone?: string;
  facultyMajor?: string;
  academicYear?: string;
  gpa?: string;
  socialPortfolioUrl?: string;
  selfIntroduction?: string;
  skillsExperience?: string;
  availability?: string;
  message?: string;
  customAnswers?: Record<string, unknown>;
  reviewNote?: string;
  internalNote?: string;
  assignDepartmentId?: string;
};

export type ApplicationSummary = {
  id: string;
  clubId: string;
  clubCode: string;
  clubName: string;
  formId?: string;
  preferredDepartmentId?: string;
  preferredDepartmentName?: string;
  secondaryDepartmentId?: string;
  secondaryDepartmentName?: string;
  facultyMajor?: string;
  academicYear?: string;
  applicantPhone?: string;
  attachmentCount?: number;
  status: string;
  createdAt: string;
  reviewedAt?: string;
  cancelledAt?: string;
};

export type ApplicationReviewSummary = {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  total: number;
  recent: ApplicationSummary[];
};

export type Application = ApplicationSummary & {
  applicantId: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantStudentCode?: string;
  applicantPhone?: string;
  facultyMajor?: string;
  academicYear?: string;
  gpa?: string;
  socialPortfolioUrl?: string;
  selfIntroduction?: string;
  skillsExperience?: string;
  availability?: string;
  message: string;
  customAnswers?: Record<string, unknown>;
  attachments?: ApplicationFile[];
  reviewedBy?: string;
  reviewNote?: string;
  internalNote?: string;
  cancelledAt?: string;
  updatedAt?: string;
  membershipId?: string;
  membershipStatus?: string;
  membershipJoinedAt?: string;
};
