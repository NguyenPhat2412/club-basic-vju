import { api, apiForm, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Page } from '@/types/common.types';
import type {
  Club,
  ClubFollowStatus,
  ClubInput,
  ClubPost,
  ClubPostLikeResult,
  CreateClubPostInput,
  Membership,
  UpdateClubPostInput,
} from '@/types/club/club.types';
import type {
  ClubFacebookOAuthPageOption,
  ClubFacebookOverview,
  ClubFacebookPublicFeed,
} from '@/types/club/facebook.types';

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
  clubMemberships: (
    clubId: string,
    status = '',
    offset = 0,
    limit = 100,
    opts?: { departmentId?: string; search?: string }
  ) =>
    api<Page<Membership>>(
      `${API_ROUTES.clubs.memberships(clubId)}?${cleanParams({
        status: status || undefined,
        departmentId: opts?.departmentId || undefined,
        search: opts?.search || undefined,
        offset,
        limit,
      })}`
    ),
  addClubMember: (clubId: string, userId: string) =>
    api<Membership>(API_ROUTES.clubs.memberships(clubId), { method: 'POST', body: JSON.stringify({ userId }) }),
  membership: (id: string) => api<Membership>(`/memberships/${id}`),
  updateMembership: (id: string, status: string) =>
    api<Membership>(`/memberships/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  removeMembership: (id: string) => api<void>(`/memberships/${id}`, { method: 'DELETE' }),
  clubFacebook: (clubId: string, limit = 20) =>
    api<ClubFacebookOverview>(`${API_ROUTES.clubs.facebook(clubId)}?${cleanParams({ limit })}`),
  connectClubFacebookToken: (clubId: string, accessToken: string) =>
    api<ClubFacebookOverview>(API_ROUTES.clubs.facebookConnectToken(clubId), {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    }),
  syncClubFacebook: (clubId: string) =>
    api<ClubFacebookOverview>(API_ROUTES.clubs.facebookSync(clubId), { method: 'PUT' }),
  disconnectClubFacebook: (clubId: string) =>
    api<void>(API_ROUTES.clubs.facebook(clubId), { method: 'DELETE' }),
  startClubFacebookOAuth: (clubId: string) =>
    api<{ authorizationUrl: string }>(API_ROUTES.clubs.facebookOAuthStart(clubId)),
  clubFacebookOAuthPages: (clubId: string, selectionToken: string) =>
    api<ClubFacebookOAuthPageOption[]>(
      `${API_ROUTES.clubs.facebookOAuthPages(clubId)}?${cleanParams({ selectionToken })}`
    ),
  selectClubFacebookOAuthPage: (clubId: string, selectionToken: string, pageId: string) =>
    api<ClubFacebookOverview>(API_ROUTES.clubs.facebookOAuthSelect(clubId), {
      method: 'POST',
      body: JSON.stringify({ selectionToken, pageId }),
    }),
  publicClubFacebookPosts: (clubId: string, limit = 6) =>
    api<ClubFacebookPublicFeed>(`${API_ROUTES.clubs.publicFacebookPosts(clubId)}?${cleanParams({ limit })}`),
  publicClubPosts: (clubId: string, offset = 0, limit = 10) =>
    api<Page<ClubPost>>(`${API_ROUTES.clubs.publicPosts(clubId)}?${cleanParams({ offset, limit })}`),
  createClubPost: (clubId: string, body: CreateClubPostInput) =>
    api<ClubPost>(API_ROUTES.clubs.posts(clubId), { method: 'POST', body: JSON.stringify(body) }),
  updateClubPost: (clubId: string, postId: string, body: UpdateClubPostInput) =>
    api<ClubPost>(API_ROUTES.clubs.postDetail(clubId, postId), { method: 'PATCH', body: JSON.stringify(body) }),
  deleteClubPost: (clubId: string, postId: string) =>
    api<void>(API_ROUTES.clubs.postDetail(clubId, postId), { method: 'DELETE' }),
  toggleClubPostLike: (clubId: string, postId: string) =>
    api<ClubPostLikeResult>(API_ROUTES.clubs.postLike(clubId, postId), { method: 'PUT' }),
  publicClubFollowStatus: (clubId: string) =>
    api<ClubFollowStatus>(API_ROUTES.clubs.publicFollowStatus(clubId)),
  toggleClubFollow: (clubId: string) =>
    api<ClubFollowStatus>(API_ROUTES.clubs.follow(clubId), { method: 'PUT' }),
};
