import { api, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Page } from '@/types/common.types';
import type { CreateTaskInput, TaskItem, TaskSummary, UpdateTaskInput } from '@/types/task/task.types';

export const tasksApi = {
  clubTasks: (
    clubId: string,
    q: { departmentId?: string; status?: string; assigneeId?: string; overdue?: boolean; offset?: number; limit?: number } = {}
  ) =>
    api<Page<TaskItem>>(
      `${API_ROUTES.clubs.tasks(clubId)}?${cleanParams({
        departmentId: q.departmentId,
        status: q.status,
        assigneeId: q.assigneeId,
        overdue: q.overdue,
        offset: q.offset ?? 0,
        limit: q.limit ?? 50,
      })}`
    ),
  clubTaskSummary: (
    clubId: string,
    q: { departmentId?: string; status?: string; assigneeId?: string; overdue?: boolean } = {}
  ) => {
    const qs = cleanParams({
      departmentId: q.departmentId,
      status: q.status,
      assigneeId: q.assigneeId,
      overdue: q.overdue,
    });
    return api<TaskSummary>(`${API_ROUTES.clubs.tasksSummary(clubId)}${qs ? `?${qs}` : ''}`);
  },
  myTasks: (q?: string | { status?: string; overdue?: boolean; offset?: number; limit?: number }) => {
    if (typeof q === 'string' || q === undefined) {
      return api<Page<TaskItem>>(`${API_ROUTES.users.myTasks}?${cleanParams({ status: q, limit: 50 })}`);
    }
    return api<Page<TaskItem>>(
      `${API_ROUTES.users.myTasks}?${cleanParams({
        status: q.status,
        overdue: q.overdue,
        offset: q.offset ?? 0,
        limit: q.limit ?? 50,
      })}`
    );
  },
  taskDetail: (taskId: string) => api<TaskItem>(`/tasks/${taskId}`),
  createTask: (clubId: string, body: CreateTaskInput) =>
    api<TaskItem>(API_ROUTES.clubs.tasks(clubId), { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (taskId: string, body: UpdateTaskInput) =>
    api<TaskItem>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateTaskProgress: (
    taskId: string,
    body: { status?: string; progressPercent?: number; progressNote?: string; reportLink?: string }
  ) => api<TaskItem>(`/tasks/${taskId}/progress`, { method: 'PATCH', body: JSON.stringify(body) }),
  verifyTask: (taskId: string) => api<TaskItem>(`/tasks/${taskId}/verify`, { method: 'PATCH' }),
};
