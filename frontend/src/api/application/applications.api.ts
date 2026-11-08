import { API_BASE, api, apiForm, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Page } from '@/types/common.types';
import type {
  Application,
  ApplicationFile,
  ApplicationForm,
  ApplicationSummary,
  CreateApplicationInput,
  ReviewApplicationInput,
  UpdateApplicationInput,
  UpsertApplicationFormInput,
} from '@/types/application/application.types';

export const applicationsApi = {
  apply: (clubId: string, body: CreateApplicationInput | string) =>
    api<Application>(API_ROUTES.clubs.applications(clubId), {
      method: 'POST',
      body: JSON.stringify(typeof body === 'string' ? { message: body } : body),
    }),
  myApplications: (q: { status?: string; clubId?: string; sort?: string; offset?: number; limit?: number } = {}) =>
    api<Page<ApplicationSummary>>(
      `${API_ROUTES.users.myApplications}?${cleanParams({
        status: q.status,
        clubId: q.clubId,
        sort: q.sort,
        offset: q.offset ?? 0,
        limit: q.limit ?? 50,
      })}`
    ),
  application: (id: string) => api<Application>(API_ROUTES.users.myApplicationDetail(id)),
  updateMyApplication: (id: string, body: UpdateApplicationInput) =>
    api<Application>(API_ROUTES.users.myApplicationDetail(id), { method: 'PUT', body: JSON.stringify(body) }),
  cancelApplication: (id: string) =>
    api<Application>(API_ROUTES.users.myApplicationCancel(id), { method: 'PATCH' }),
  clubApplicationForm: (clubId: string) =>
    api<ApplicationForm>(API_ROUTES.clubs.activeApplicationForm(clubId)),
  clubApplicationForms: (clubId: string) =>
    api<ApplicationForm[]>(API_ROUTES.clubs.applicationForms(clubId)),
  createClubApplicationForm: (clubId: string, body: UpsertApplicationFormInput) =>
    api<ApplicationForm>(API_ROUTES.clubs.applicationForms(clubId), {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createApplicationForm: (clubId: string, body: UpsertApplicationFormInput) =>
    api<ApplicationForm>(API_ROUTES.clubs.applicationForms(clubId), {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateClubApplicationForm: (clubId: string, formId: string, body: UpsertApplicationFormInput) =>
    api<ApplicationForm>(API_ROUTES.clubs.applicationFormDetail(clubId, formId), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  updateApplicationForm: (clubId: string, formId: string, body: UpsertApplicationFormInput) =>
    api<ApplicationForm>(API_ROUTES.clubs.applicationFormDetail(clubId, formId), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteClubApplicationForm: (clubId: string, formId: string) =>
    api<void>(API_ROUTES.clubs.applicationFormDetail(clubId, formId), { method: 'DELETE' }),
  deleteApplicationForm: (clubId: string, formId: string) =>
    api<void>(API_ROUTES.clubs.applicationFormDetail(clubId, formId), { method: 'DELETE' }),
  uploadFormFile: (clubId: string, formId: string, file: File, fileCategory?: string) => {
    const form = new FormData();
    form.append('file', file);
    const q = fileCategory ? `?fileCategory=${encodeURIComponent(fileCategory)}` : '';
    return apiForm<ApplicationFile>(`${API_ROUTES.clubs.applicationFormFiles(clubId, formId)}${q}`, form);
  },
  uploadApplicationFormFile: (clubId: string, formId: string, file: File, fileCategory?: string) => {
    const form = new FormData();
    form.append('file', file);
    const q = fileCategory ? `?fileCategory=${encodeURIComponent(fileCategory)}` : '';
    return apiForm<ApplicationFile>(`${API_ROUTES.clubs.applicationFormFiles(clubId, formId)}${q}`, form);
  },
  deleteFormFile: (clubId: string, formId: string, fileId: string) =>
    api<void>(API_ROUTES.clubs.applicationFormFileDetail(clubId, formId, fileId), { method: 'DELETE' }),
  deleteApplicationFormFile: (clubId: string, formId: string, fileId: string) =>
    api<void>(API_ROUTES.clubs.applicationFormFileDetail(clubId, formId, fileId), { method: 'DELETE' }),
  uploadApplicationFile: (applicationId: string, file: File, fileCategory?: string) => {
    const form = new FormData();
    form.append('file', file);
    const q = fileCategory ? `?fileCategory=${encodeURIComponent(fileCategory)}` : '';
    return apiForm<ApplicationFile>(`/applications/${applicationId}/files${q}`, form);
  },
  deleteApplicationFile: (applicationId: string, fileId: string) =>
    api<void>(`/applications/${applicationId}/files/${fileId}`, { method: 'DELETE' }),
  applicationFileUrl: (fileId: string, inline = false) =>
    `${API_BASE}/api/v1/application-files/${fileId}/download?inline=${inline}`,
  clubApplications: (
    clubId: string,
    q: { status?: string; search?: string; createdFrom?: string; createdTo?: string; sort?: string; offset?: number; limit?: number } = {}
  ) =>
    api<Page<Application>>(
      `${API_ROUTES.clubs.applications(clubId)}?${cleanParams({
        status: q.status,
        search: q.search,
        createdFrom: q.createdFrom,
        createdTo: q.createdTo,
        sort: q.sort,
        offset: q.offset ?? 0,
        limit: q.limit ?? 20,
      })}`
    ),
  clubApplicationDetail: (clubId: string, applicationId: string) =>
    api<Application>(API_ROUTES.clubs.applicationDetail(clubId, applicationId)),
  updateClubApplication: (clubId: string, applicationId: string, body: UpdateApplicationInput) =>
    api<Application>(API_ROUTES.clubs.applicationDetail(clubId, applicationId), {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  approve: (clubId: string, applicationId: string, body: ReviewApplicationInput | string = {}, departmentId?: string) =>
    api<Application>(API_ROUTES.clubs.applicationApprove(clubId, applicationId), {
      method: 'POST',
      body: JSON.stringify(
        typeof body === 'string'
          ? { reviewNote: body || undefined, departmentId: departmentId || undefined }
          : {
              reviewNote: body.reviewNote || undefined,
              internalNote: body.internalNote || undefined,
              departmentId: body.departmentId || undefined,
              skipDepartmentAssignment: body.skipDepartmentAssignment,
            }
      ),
    }),
  reject: (clubId: string, applicationId: string, body: ReviewApplicationInput | string = {}) =>
    api<Application>(API_ROUTES.clubs.applicationReject(clubId, applicationId), {
      method: 'POST',
      body: JSON.stringify(
        typeof body === 'string'
          ? { reviewNote: body || undefined }
          : {
              reviewNote: body.reviewNote || undefined,
              internalNote: body.internalNote || undefined,
            }
      ),
    }),
};
