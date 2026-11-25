import { api, apiForm } from '@/lib/api/client';
import type {
  CertificateManagementQuery,
  CertificateManagementResponse,
  CertificateTemplateResponse,
  EventCertificate,
  IssueCertificatesResponse,
  PublicCertificateVerification,
  RemindCertificatesRequest,
  RemindCertificatesResponse,
} from '@/types/certificate/certificate.types';

export type CertificateListResponse = {
  items: EventCertificate[];
  total: number;
};

function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const certificateApi = {
  issueEventCertificates: (eventId: string) =>
    api<IssueCertificatesResponse>(`/events/${eventId}/certificates/issue`, {
      method: 'POST',
    }),
  eventCertificates: (eventId: string) =>
    api<CertificateListResponse>(`/events/${eventId}/certificates`),
  uploadEventCertificateTemplate: (eventId: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return apiForm<CertificateTemplateResponse>(`/events/${eventId}/certificate-template`, body);
  },
  deleteEventCertificateTemplate: (eventId: string) =>
    api<CertificateTemplateResponse>(`/events/${eventId}/certificate-template`, {
      method: 'DELETE',
    }),
  remindEventCertificates: (eventId: string, payload?: RemindCertificatesRequest) =>
    api<RemindCertificatesResponse>(`/events/${eventId}/certificates/remind`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),
  revokeCertificate: (certificateId: string, reason: string) =>
    api<EventCertificate>(`/certificates/${certificateId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason.trim() }),
    }),
  acknowledgeMyCertificate: (certificateId: string) =>
    api<EventCertificate>(`/me/certificates/${certificateId}/acknowledge`, {
      method: 'POST',
    }),
  myCertificates: () => api<CertificateListResponse>('/me/certificates'),
  managementCertificates: (query: CertificateManagementQuery = {}) =>
    api<CertificateManagementResponse>(
      `/certificates/management${buildQuery({
        clubId: query.clubId || undefined,
        academicTerm: query.academicTerm || undefined,
        status: query.status || undefined,
        acknowledged:
          typeof query.acknowledged === 'boolean' ? String(query.acknowledged) : undefined,
        search: query.search?.trim() || undefined,
        offset: query.offset,
        limit: query.limit,
      })}`,
    ),
  verifyCertificate: (certificateCode: string) =>
    api<PublicCertificateVerification>(
      `/public/certificates/verify/${encodeURIComponent(certificateCode.trim())}`,
    ),
};
