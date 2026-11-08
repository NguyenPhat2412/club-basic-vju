import { api, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Page } from '@/types/common.types';
import type { Department, DepartmentMember } from '@/types/department/department.types';

export const departmentsApi = {
  departments: (clubId: string) => api<Page<Department>>(`${API_ROUTES.clubs.departments(clubId)}?limit=50`),
  createDepartment: (clubId: string, body: { name: string; description?: string }) =>
    api<Department>(API_ROUTES.clubs.departments(clubId), { method: 'POST', body: JSON.stringify(body) }),
  updateDepartment: (id: string, body: { name?: string; description?: string }) =>
    api<Department>(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateDepartmentStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    api<Department>(`/departments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  departmentMembers: (departmentId: string, offset = 0, limit = 100) =>
    api<Page<DepartmentMember>>(`/departments/${departmentId}/members?${cleanParams({ offset, limit })}`),
  addDepartmentMember: (departmentId: string, membershipId: string) =>
    api<DepartmentMember>(`/departments/${departmentId}/members`, {
      method: 'POST',
      body: JSON.stringify({ membershipId }),
    }),
  moveDepartmentMember: (departmentId: string, membershipId: string, targetDepartmentId: string) =>
    api<DepartmentMember>(`/departments/${departmentId}/members/${membershipId}`, {
      method: 'PATCH',
      body: JSON.stringify({ targetDepartmentId }),
    }),
  removeDepartmentMember: (departmentId: string, membershipId: string) =>
    api<void>(`/departments/${departmentId}/members/${membershipId}`, { method: 'DELETE' }),
};
