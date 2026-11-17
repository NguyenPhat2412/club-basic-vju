import { api } from '@/lib/api/client';
import type { SystemSettings, SystemSettingsInput } from '@/types/settings/settings.types';

export const settingsApi = {
  systemSettings: () => api<SystemSettings>('/system-settings'),
  updateSystemSettings: (body: SystemSettingsInput) =>
    api<SystemSettings>('/system-settings', { method: 'PUT', body: JSON.stringify(body) }),
  testSmtpEmail: (recipientEmail: string) =>
    api<void>('/system-settings/smtp-test', {
      method: 'PUT',
      body: JSON.stringify({ recipientEmail }),
    }),
};
