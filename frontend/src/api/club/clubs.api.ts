import { api, apiForm, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Page } from '@/types/common.types';
import type { Club, ClubInput, Membership } from '@/types/club/club.types';

export const clubsApi = {
  publicClubs: (query = '', category = '', offset = 0, limit = 50) =>
    api<Page<Club>>(`${API_ROUTES.clubs.publicList}?${cleanParams({ query, category, offset, limit })}`),
  publicClubCategories: () => api<string[]>(API_ROUTES.clubs.publicCategories),
  publicClub: (id: string) => api<Club>(API_ROUTES.clubs.publicDetail(id)),
  clubs: (query = '', category = '', offset = 0, limit = 50, status?: string) =>
    api<Page<Club>>(`${API_ROUTES.clubs.list}?${cleanParams({ query, category, status, offset, limit })}`),
  club: (id: string) => api<Club>(API_ROUTES.clubs.detail(id)),
  createClub: (body: ClubInput) =>
    api<Club>(API_ROUTES.clubs.list, { method: 'POST', body: JSON.stringify(body) }),
  updateClub: (id: string, body: Partial<ClubInput>) =>
    api<Club>(API_ROUTES.clubs.detail(id), { method: 'PATCH', body: JSON.stringify(body) }),
  updateClubStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    api<Club>(API_ROUTES.clubs.status(id), { method: 'PATCH', body: JSON.stringify({ status }) }),
  uploadClubLogo: (clubId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiForm<Club>(API_ROUTES.clubs.logo(clubId), form);
  },
  uploadClubCover: (clubId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiForm<Club>(API_ROUTES.clubs.cover(clubId), form);
  },
  myMemberships: (q: { status?: string; offset?: number; limit?: number } = {}) =>
    api<Page<Membership>>(
      `${API_ROUTES.users.myMemberships}?${cleanParams({ status: q.status, offset: q.offset ?? 0, limit: q.limit ?? 50 })}`
    ),
  clubMemberships: (clubId: string, status = '', offset = 0, limit = 100) =>
    api<Page<Membership>>(
      `${API_ROUTES.clubs.memberships(clubId)}?${cleanParams({ status: status || undefined, offset, limit })}`
    ),
  addClubMember: (clubId: string, userId: string) =>
    api<Membership>(API_ROUTES.clubs.memberships(clubId), { method: 'POST', body: JSON.stringify({ userId }) }),
  membership: (id: string) => api<Membership>(`/memberships/${id}`),
  updateMembership: (id: string, status: string) =>
    api<Membership>(`/memberships/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  removeMembership: (id: string) => api<void>(`/memberships/${id}`, { method: 'DELETE' }),
};
