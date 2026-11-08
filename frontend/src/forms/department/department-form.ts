import type { Department } from '@/types/department/department.types';

export interface DepartmentFormDraft {
  name: string;
  description: string;
}

export function emptyDepartmentDraft(): DepartmentFormDraft {
  return { name: '', description: '' };
}

export function departmentToDraft(dept: Department): DepartmentFormDraft {
  return {
    name: dept.name ?? '',
    description: dept.description ?? '',
  };
}

export function canSubmitDepartmentDraft(draft: DepartmentFormDraft): boolean {
  return draft.name.trim().length > 0;
}

export function toDepartmentPayload(draft: DepartmentFormDraft) {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
  };
}
