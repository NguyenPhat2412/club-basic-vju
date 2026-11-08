'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notification/notifications.api';

export function useMyNotifications(offset = 0, limit = 30, enabled = true) {
  return useQuery({
    queryKey: ['notifications', offset, limit],
    queryFn: () => notificationsApi.notifications(offset, limit),
    enabled,
  });
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markNotificationRead(id),
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllNotificationsRead(),
    onSuccess: invalidate,
  });

  return { markRead, markAllRead };
}
