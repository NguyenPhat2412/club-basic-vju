'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/settings/settings.api';
import type { SystemSettingsInput } from '@/types/settings/settings.types';

export function useSystemSettings(enabled = true) {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: () => settingsApi.systemSettings(),
    enabled,
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SystemSettingsInput) => settingsApi.updateSystemSettings(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-settings'] }),
  });
}
