'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { departmentsApi } from '@/api/department/departments.api';

export function useClubDepartments(clubId: string, enabled = true) {
  return useQuery({
    queryKey: ['departments', clubId],
    queryFn: () => departmentsApi.departments(clubId),
    enabled: Boolean(clubId && enabled),
  });
}

export function useDepartmentMutations(clubId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['departments', clubId] });
    queryClient.invalidateQueries({ queryKey: ['department-members'] });
    queryClient.invalidateQueries({ queryKey: ['club-positions', clubId] });
  };

  const createDepartment = useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      departmentsApi.createDepartment(clubId, body),
    onSuccess: invalidate,
  });

  const updateDepartment = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string; description?: string } }) =>
      departmentsApi.updateDepartment(id, body),
    onSuccess: invalidate,
  });

  const updateDepartmentStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      departmentsApi.updateDepartmentStatus(id, status),
    onSuccess: invalidate,
  });

  return { createDepartment, updateDepartment, updateDepartmentStatus };
}
