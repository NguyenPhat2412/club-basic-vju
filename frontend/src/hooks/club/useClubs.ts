'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clubsApi } from '@/api/club/clubs.api';
import type { ClubInput } from '@/types/club/club.types';

export function usePublicClubs(query = '', category = '', offset = 0, limit = 50, enabled = true) {
  return useQuery({
    queryKey: ['public-clubs', query, category, offset, limit],
    queryFn: () => clubsApi.publicClubs(query, category, offset, limit),
    enabled,
  });
}

export function useClubsList(query = '', category = '', offset = 0, limit = 50, status?: string, enabled = true) {
  return useQuery({
    queryKey: ['clubs', query, category, offset, limit, status],
    queryFn: () => clubsApi.clubs(query, category, offset, limit, status),
    enabled,
  });
}

export function useMyMemberships(status?: string, enabled = true) {
  return useQuery({
    queryKey: ['my-memberships', status],
    queryFn: () => clubsApi.myMemberships({ status, limit: 100 }),
    enabled,
  });
}

export function useClubMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['clubs'] });
    queryClient.invalidateQueries({ queryKey: ['public-clubs'] });
    queryClient.invalidateQueries({ queryKey: ['home', 'public-clubs'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'public-clubs'] });
  };

  const createClub = useMutation({
    mutationFn: (body: ClubInput) => clubsApi.createClub(body),
    onSuccess: invalidate,
  });

  const updateClub = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ClubInput> }) => clubsApi.updateClub(id, body),
    onSuccess: invalidate,
  });

  const updateClubStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      clubsApi.updateClubStatus(id, status),
    onSuccess: invalidate,
  });

  return { createClub, updateClub, updateClubStatus };
}
