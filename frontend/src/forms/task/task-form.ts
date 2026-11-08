import type { EventRegistration } from '@/types/event/event.types';
import type { Membership } from '@/types/club/club.types';
import type { CreateTaskInput } from '@/types/task/task.types';

export interface TaskFormValues {
  departmentId: string;
  eventId: string;
  parentTaskId: string;
  title: string;
  description: string;
  priority: string;
  deadline: string;
  assigneeId: string;
}

export type TaskFormDraft = TaskFormValues;

export const EMPTY_TASK_FORM: TaskFormValues = {
  departmentId: '',
  eventId: '',
  parentTaskId: '',
  title: '',
  description: '',
  priority: 'MEDIUM',
  deadline: '',
  assigneeId: '',
};

export function emptyTaskFormDraft(): TaskFormValues {
  return { ...EMPTY_TASK_FORM };
}

export function toIso(localStr: string): string {
  if (!localStr) return '';
  const d = new Date(localStr);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function toLocalInput(isoStr?: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function canSubmitTaskDraft(draft: TaskFormValues): boolean {
  return Boolean(draft.title.trim() && draft.deadline && draft.assigneeId);
}

export function toCreateTaskPayload(draft: TaskFormValues): CreateTaskInput {
  return {
    departmentId: draft.departmentId || undefined,
    eventId: draft.eventId || undefined,
    parentTaskId: draft.parentTaskId || undefined,
    title: draft.title.trim(),
    description: draft.description.trim() || undefined,
    priority: draft.priority || 'MEDIUM',
    deadline: toIso(draft.deadline),
    assigneeId: draft.assigneeId,
  };
}

export function buildTaskAssigneeCandidates(
  members: Membership[],
  activeEventId: string,
  eventRegs: EventRegistration[] = []
): { userId: string; label: string }[] {
  const map = new Map<string, { userId: string; label: string }>();
  for (const m of members) {
    map.set(m.userId, {
      userId: m.userId,
      label: `${m.userFullName || m.userStudentCode || m.userId.slice(0, 8)} (Thành viên CLB)`,
    });
  }
  if (activeEventId) {
    for (const r of eventRegs) {
      if (r.status === 'REGISTERED' && !map.has(r.userId)) {
        map.set(r.userId, {
          userId: r.userId,
          label: `${r.userFullName || r.studentCode || r.userEmail || r.userId.slice(0, 8)} (CTV sự kiện${r.eventRole ? ` · ${r.eventRole}` : ''})`,
        });
      }
    }
  }
  return [...map.values()];
}
