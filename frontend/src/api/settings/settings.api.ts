import { api } from '@/lib/api/client';
import type {
  BlockedIpItem,
  BlockIpInput,
  PublicSystemStatus,
  SystemInfraHealth,
  SystemSecurityOverview,
  SystemSettings,
  SystemSettingsInput,
} from '@/types/settings/settings.types';

export const settingsApi = {
  publicSystemStatus: () => api<PublicSystemStatus>('/public/system-status'),
  systemSettings: () => api<SystemSettings>('/system-settings'),
  updateSystemSettings: (body: SystemSettingsInput) =>
    api<SystemSettings>('/system-settings', { method: 'PUT', body: JSON.stringify(body) }),
  testSmtpEmail: (recipientEmail: string) =>
    api<void>('/system-settings/smtp-test', {
      method: 'PUT',
      body: JSON.stringify({ recipientEmail }),
    }),
  testTelegramAlert: () =>
    api<void>('/system-settings/telegram-test', {
      method: 'PUT',
    }),
  systemSecurityOverview: (hours = 24) =>
    api<SystemSecurityOverview>(`/system-settings/security-overview?hours=${encodeURIComponent(String(hours))}`),
  disconnectOnlineUser: (userId: string) =>
    api<void>(`/system-settings/online-users/${encodeURIComponent(userId)}/sessions`, {
      method: 'DELETE',
    }),
  systemInfraHealth: () => api<SystemInfraHealth>('/system-settings/infra-health'),
  blockedIps: () => api<BlockedIpItem[]>('/system-settings/blocked-ips'),
  blockIp: (body: BlockIpInput) =>
    api<BlockedIpItem>('/system-settings/blocked-ips', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  unblockIp: (ipId: string) =>
    api<void>(`/system-settings/blocked-ips/${encodeURIComponent(ipId)}`, {
      method: 'DELETE',
    }),
};
