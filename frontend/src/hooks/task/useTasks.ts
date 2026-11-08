'use client';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/api/task/tasks.api';

export function useClubTasks(
  clubId: string,
  q: { departmentId?: string; status?: string; assigneeId?: string; overdue?: boolean; offset?: number; limit?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ['club-tasks', clubId, q],
    queryFn: () => tasksApi.clubTasks(clubId, q),
    enabled: Boolean(clubId && enabled),
  });
}

export function useMyTasks(
  q?: string | { status?: string; overdue?: boolean; offset?: number; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: ['my-tasks', q],
    queryFn: () => tasksApi.myTasks(q),
    enabled,
  });
}
