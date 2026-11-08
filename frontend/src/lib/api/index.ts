import { authApi } from '@/api/auth/auth.api';
import { usersApi } from '@/api/user/users.api';
import { accessApi } from '@/api/access/access.api';
import { clubsApi } from '@/api/club/clubs.api';
import { departmentsApi } from '@/api/department/departments.api';
import { applicationsApi } from '@/api/application/applications.api';
import { eventsApi } from '@/api/event/events.api';
import { tasksApi } from '@/api/task/tasks.api';
import { documentsApi } from '@/api/document/documents.api';
import { chatApi } from '@/api/chat/chat.api';
import { notificationsApi } from '@/api/notification/notifications.api';
import { statisticsApi } from '@/api/statistics/statistics.api';
import { settingsApi } from '@/api/settings/settings.api';
import { auditApi } from '@/api/audit/audit.api';

export * from './client';
export * from './routes';
export * from '@/types';
export { describeError, errorMessage } from '@/lib/errors';

export const apiModel = {
  ...authApi,
  ...usersApi,
  ...accessApi,
  ...clubsApi,
  ...departmentsApi,
  ...applicationsApi,
  ...eventsApi,
  ...tasksApi,
  ...documentsApi,
  ...chatApi,
  ...notificationsApi,
  ...statisticsApi,
  ...settingsApi,
  ...auditApi,
};
