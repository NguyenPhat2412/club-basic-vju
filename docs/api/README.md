# VJU Club Management System — Swagger / OpenAPI Inventory (143 Endpoints)

The backend assigned to this system is `backend/springboot` (Spring Boot 4.1.1 / Java 21 / PostgreSQL 16).

## Live Swagger & OpenAPI URLs

| Environment | Swagger UI | OpenAPI 3.1 JSON | Static OpenAPI YAML | Runtime API Catalog |
|---|---|---|---|---|
| **Production (HTTPS)** | `https://api.vju-club.all1.vn/swagger-ui.html` | `https://api.vju-club.all1.vn/v3/api-docs` | `https://api.vju-club.all1.vn/api-docs/phase1.yaml` | `https://api.vju-club.all1.vn/api/v1/api-catalog` |
| **Stagging (HTTPS)** | `https://stagging.vju-club.all1.vn/swagger-ui.html` | `https://stagging.vju-club.all1.vn/v3/api-docs` | `https://stagging.vju-club.all1.vn/api-docs/phase1.yaml` | `https://stagging.vju-club.all1.vn/api/v1/api-catalog` |
| **Local Development** | `http://localhost:8080/swagger-ui.html` | `http://localhost:8080/v3/api-docs` | `http://localhost:8080/api-docs/phase1.yaml` | `http://localhost:8080/api/v1/api-catalog` |

- **Source catalog:** [`docs/api/catalog.yml`](catalog.yml) (synced with `backend/springboot/src/main/resources/api/catalog.yml`)
- **Source OpenAPI contract:** [`docs/api/openapi.yaml`](openapi.yaml) (synced with `backend/springboot/src/main/resources/api/phase1-openapi.yaml`)
- **All 143 endpoints** across **19 modules** are marked `IMPLEMENTED` and verified by automated PostgreSQL integration tests and static OpenAPI 3.1 contract checks (`16/16 Pass`).

## Authentication & Conventions

- **Authentication:** Send the `CLUB_SESSION` HttpOnly session cookie (plus `X-XSRF-TOKEN` header matching the `XSRF-TOKEN` cookie on unsafe methods `POST/PUT/PATCH/DELETE`) for all protected routes (`PUBLIC` routes do not require a session; `AUTHENTICATED` routes require an active logged-in session).
- **Pagination:** List endpoints use `offset` (default `0`) and `limit` (default `20`, max `100`) and return `{ items, total, offset, limit }`.
- **Error Format:** RFC 7807 Problem Details (`application/problem+json`) with a stable `code` property.
- **Contract verification:**
  ```bash
  python3 -m unittest discover -s docs/api/tests -v
  ```

---

## Complete Swagger API Endpoint List (143 Endpoints)

| # | Module | Operation ID | Method | Path | Permission / Auth | Summary | Status |
|---:|---|---|---|---|---|---|---|
| 1 | `system` | `system.get` | **GET** | `/api/v1/api-catalog` | `PUBLIC` | /api/v1/api-catalog | `IMPLEMENTED` |
| 2 | `authentication` | `authentication.post` | **POST** | `/api/v1/auth/login` | `PUBLIC` | /api/v1/auth/login | `IMPLEMENTED` |
| 3 | `authentication` | `authentication.post` | **POST** | `/api/v1/auth/register` | `PUBLIC` | /api/v1/auth/register | `IMPLEMENTED` |
| 4 | `authentication` | `authentication.post` | **POST** | `/api/v1/auth/google` | `PUBLIC` | /api/v1/auth/google | `IMPLEMENTED` |
| 5 | `authentication` | `authentication.get` | **GET** | `/api/v1/auth/google/config` | `PUBLIC` | /api/v1/auth/google/config | `IMPLEMENTED` |
| 6 | `authentication` | `authentication.post` | **POST** | `/api/v1/auth/logout` | `AUTHENTICATED` | /api/v1/auth/logout | `IMPLEMENTED` |
| 7 | `authentication` | `authentication.get` | **GET** | `/api/v1/auth/csrf` | `PUBLIC` | /api/v1/auth/csrf | `IMPLEMENTED` |
| 8 | `authentication` | `authentication.get` | **GET** | `/api/v1/auth/me` | `AUTHENTICATED` | /api/v1/auth/me | `IMPLEMENTED` |
| 9 | `user-management` | `user-management.post` | **POST** | `/api/v1/users` | `user.create` | /api/v1/users | `IMPLEMENTED` |
| 10 | `user-profile` | `user-profile.get` | **GET** | `/api/v1/users/me` | `AUTHENTICATED` | /api/v1/users/me | `IMPLEMENTED` |
| 11 | `user-profile` | `user-profile.patch` | **PATCH** | `/api/v1/users/me` | `AUTHENTICATED` | /api/v1/users/me | `IMPLEMENTED` |
| 12 | `user-profile` | `user-profile.get` | **GET** | `/api/v1/users` | `user.view` | /api/v1/users | `IMPLEMENTED` |
| 13 | `user-profile` | `user-profile.get` | **GET** | `/api/v1/users/{userId}` | `user.view` | /api/v1/users/{userId} | `IMPLEMENTED` |
| 14 | `user-management` | `user-management.patch` | **PATCH** | `/api/v1/users/{userId}/password` | `user.reset_password` | /api/v1/users/{userId}/password | `IMPLEMENTED` |
| 15 | `user-profile` | `user-profile.patch` | **PATCH** | `/api/v1/users/{userId}/status` | `user.active \| user.inactive` | /api/v1/users/{userId}/status | `IMPLEMENTED` |
| 16 | `user-profile` | `user-profile.post` | **POST** | `/api/v1/users/me/avatar` | `AUTHENTICATED` | /api/v1/users/me/avatar | `IMPLEMENTED` |
| 17 | `user-profile` | `user-profile.post` | **POST** | `/api/v1/users/{userId}/avatar` | `user.update` | /api/v1/users/{userId}/avatar | `IMPLEMENTED` |
| 18 | `club` | `club.get` | **GET** | `/api/v1/public/clubs` | `PUBLIC` | /api/v1/public/clubs | `IMPLEMENTED` |
| 19 | `club` | `club.get` | **GET** | `/api/v1/public/clubs/categories` | `PUBLIC` | /api/v1/public/clubs/categories | `IMPLEMENTED` |
| 20 | `club` | `club.get` | **GET** | `/api/v1/public/clubs/{clubId}` | `PUBLIC` | /api/v1/public/clubs/{clubId} | `IMPLEMENTED` |
| 21 | `club` | `club.get` | **GET** | `/api/v1/public/clubs/{clubId}/logo` | `PUBLIC` | /api/v1/public/clubs/{clubId}/logo | `IMPLEMENTED` |
| 22 | `user-profile` | `user-profile.get` | **GET** | `/api/v1/public/avatars/{fileName}` | `PUBLIC` | /api/v1/public/avatars/{fileName} | `IMPLEMENTED` |
| 23 | `club` | `club.get` | **GET** | `/api/v1/public/clubs/{clubId}/cover` | `PUBLIC` | /api/v1/public/clubs/{clubId}/cover | `IMPLEMENTED` |
| 24 | `club` | `club.get` | **GET** | `/api/v1/clubs` | `club.view` | /api/v1/clubs | `IMPLEMENTED` |
| 25 | `club` | `club.get` | **GET** | `/api/v1/clubs/{clubId}` | `club.view` | /api/v1/clubs/{clubId} | `IMPLEMENTED` |
| 26 | `club` | `club.post` | **POST** | `/api/v1/clubs` | `club.create` | /api/v1/clubs | `IMPLEMENTED` |
| 27 | `club` | `club.patch` | **PATCH** | `/api/v1/clubs/{clubId}` | `club.update` | /api/v1/clubs/{clubId} | `IMPLEMENTED` |
| 28 | `club` | `club.patch` | **PATCH** | `/api/v1/clubs/{clubId}/status` | `club.active \| club.inactive` | /api/v1/clubs/{clubId}/status | `IMPLEMENTED` |
| 29 | `club` | `club.post` | **POST** | `/api/v1/clubs/{clubId}/logo` | `club.update` | /api/v1/clubs/{clubId}/logo | `IMPLEMENTED` |
| 30 | `club` | `club.post` | **POST** | `/api/v1/clubs/{clubId}/cover` | `club.update` | /api/v1/clubs/{clubId}/cover | `IMPLEMENTED` |
| 31 | `department` | `department.get` | **GET** | `/api/v1/clubs/{clubId}/departments` | `department.view` | /api/v1/clubs/{clubId}/departments | `IMPLEMENTED` |
| 32 | `department` | `department.get` | **GET** | `/api/v1/departments/{departmentId}` | `department.view` | /api/v1/departments/{departmentId} | `IMPLEMENTED` |
| 33 | `department` | `department.post` | **POST** | `/api/v1/clubs/{clubId}/departments` | `department.create` | /api/v1/clubs/{clubId}/departments | `IMPLEMENTED` |
| 34 | `department` | `department.patch` | **PATCH** | `/api/v1/departments/{departmentId}` | `department.update` | /api/v1/departments/{departmentId} | `IMPLEMENTED` |
| 35 | `department` | `department.patch` | **PATCH** | `/api/v1/departments/{departmentId}/status` | `department.activate \| department.inactive` | /api/v1/departments/{departmentId}/status | `IMPLEMENTED` |
| 36 | `membership` | `membership.get` | **GET** | `/api/v1/clubs/{clubId}/memberships` | `member.view` | /api/v1/clubs/{clubId}/memberships | `IMPLEMENTED` |
| 37 | `membership` | `membership.get` | **GET** | `/api/v1/memberships/{membershipId}` | `member.view_detail` | /api/v1/memberships/{membershipId} | `IMPLEMENTED` |
| 38 | `membership` | `membership.post` | **POST** | `/api/v1/clubs/{clubId}/memberships` | `member.add` | /api/v1/clubs/{clubId}/memberships | `IMPLEMENTED` |
| 39 | `membership` | `membership.patch` | **PATCH** | `/api/v1/memberships/{membershipId}` | `member.update` | /api/v1/memberships/{membershipId} | `IMPLEMENTED` |
| 40 | `membership` | `membership.delete` | **DELETE** | `/api/v1/memberships/{membershipId}` | `member.remove` | /api/v1/memberships/{membershipId} | `IMPLEMENTED` |
| 41 | `department-member` | `department-member.get` | **GET** | `/api/v1/departments/{departmentId}/members` | `department.member.view` | /api/v1/departments/{departmentId}/members | `IMPLEMENTED` |
| 42 | `department-member` | `department-member.post` | **POST** | `/api/v1/departments/{departmentId}/members` | `department.member.add` | /api/v1/departments/{departmentId}/members | `IMPLEMENTED` |
| 43 | `department-member` | `department-member.delete` | **DELETE** | `/api/v1/departments/{departmentId}/members/{membershipId}` | `department.member.remove` | /api/v1/departments/{departmentId}/members/{membershipId} | `IMPLEMENTED` |
| 44 | `permission-management` | `permission-management.get` | **GET** | `/api/v1/permissions` | `permission.view` | /api/v1/permissions | `IMPLEMENTED` |
| 45 | `permission-management` | `permission-management.post` | **POST** | `/api/v1/users/{userId}/permissions` | `permission.assign` | /api/v1/users/{userId}/permissions | `IMPLEMENTED` |
| 46 | `permission-management` | `permission-management.delete` | **DELETE** | `/api/v1/users/{userId}/permissions/{permissionId}` | `permission.revoke` | /api/v1/users/{userId}/permissions/{permissionId} | `IMPLEMENTED` |
| 47 | `user-management` | `user-management.patch` | **PATCH** | `/api/v1/users/{userId}` | `user.update` | /api/v1/users/{userId} | `IMPLEMENTED` |
| 48 | `permission-management` | `permission-management.delete` | **DELETE** | `/api/v1/users/{userId}/permissions/by-key/{permissionKey}` | `permission.revoke` | /api/v1/users/{userId}/permissions/by-key/{permissionKey} | `IMPLEMENTED` |
| 49 | `authentication` | `authentication.post` | **POST** | `/api/v1/auth/change-password` | `AUTHENTICATED` | /api/v1/auth/change-password | `IMPLEMENTED` |
| 50 | `permission-management` | `permission-management.get` | **GET** | `/api/v1/users/me/permissions` | `AUTHENTICATED` | /api/v1/users/me/permissions | `IMPLEMENTED` |
| 51 | `permission-management` | `permission-management.get` | **GET** | `/api/v1/users/{userId}/permissions` | `permission.view` | /api/v1/users/{userId}/permissions | `IMPLEMENTED` |
| 52 | `department-member` | `department-member.patch` | **PATCH** | `/api/v1/departments/{departmentId}/members/{membershipId}` | `department.member.remove & department.member.add` | /api/v1/departments/{departmentId}/members/{membershipId} | `IMPLEMENTED` |
| 53 | `role-management` | `role-management.get` | **GET** | `/api/v1/roles` | `role.view` | /api/v1/roles | `IMPLEMENTED` |
| 54 | `role-management` | `role-management.post` | **POST** | `/api/v1/roles` | `role.manage` | /api/v1/roles | `IMPLEMENTED` |
| 55 | `role-management` | `role-management.get` | **GET** | `/api/v1/roles/{roleId}` | `role.view` | /api/v1/roles/{roleId} | `IMPLEMENTED` |
| 56 | `role-management` | `role-management.patch` | **PATCH** | `/api/v1/roles/{roleId}` | `role.manage` | /api/v1/roles/{roleId} | `IMPLEMENTED` |
| 57 | `role-management` | `role-management.get` | **GET** | `/api/v1/users/me/roles` | `AUTHENTICATED` | /api/v1/users/me/roles | `IMPLEMENTED` |
| 58 | `role-management` | `role-management.get` | **GET** | `/api/v1/users/{userId}/roles` | `permission.view` | /api/v1/users/{userId}/roles | `IMPLEMENTED` |
| 59 | `role-management` | `role-management.post` | **POST** | `/api/v1/users/{userId}/roles` | `permission.assign` | /api/v1/users/{userId}/roles | `IMPLEMENTED` |
| 60 | `role-management` | `role-management.delete` | **DELETE** | `/api/v1/users/{userId}/roles/{assignmentId}` | `permission.revoke` | /api/v1/users/{userId}/roles/{assignmentId} | `IMPLEMENTED` |
| 61 | `permission-management` | `permission-management.get` | **GET** | `/api/v1/users/me/effective-permissions` | `AUTHENTICATED` | /api/v1/users/me/effective-permissions | `IMPLEMENTED` |
| 62 | `permission-management` | `permission-management.get` | **GET** | `/api/v1/users/{userId}/effective-permissions` | `permission.view` | /api/v1/users/{userId}/effective-permissions | `IMPLEMENTED` |
| 63 | `permission-management` | `permission-management.get` | **GET** | `/api/v1/permissions/groups` | `permission.view` | /api/v1/permissions/groups | `IMPLEMENTED` |
| 64 | `permission-management` | `permission-management.put` | **PUT** | `/api/v1/users/{userId}/permissions` | `permission.assign` | /api/v1/users/{userId}/permissions | `IMPLEMENTED` |
| 65 | `setting` | `setting.get` | **GET** | `/api/v1/system-settings` | `setting.view` | /api/v1/system-settings | `IMPLEMENTED` |
| 66 | `setting` | `setting.put` | **PUT** | `/api/v1/system-settings` | `setting.update` | /api/v1/system-settings | `IMPLEMENTED` |
| 67 | `audit` | `audit.get` | **GET** | `/api/v1/audit-logs` | `audit.view` | /api/v1/audit-logs | `IMPLEMENTED` |
| 68 | `club-application` | `club-application.post` | **POST** | `/api/v1/clubs/{clubId}/applications` | `AUTHENTICATED` | /api/v1/clubs/{clubId}/applications | `IMPLEMENTED` |
| 69 | `club-application` | `club-application.get` | **GET** | `/api/v1/users/me/applications` | `AUTHENTICATED` | /api/v1/users/me/applications | `IMPLEMENTED` |
| 70 | `club-application` | `club-application.get` | **GET** | `/api/v1/users/me/applications/{applicationId}` | `AUTHENTICATED` | /api/v1/users/me/applications/{applicationId} | `IMPLEMENTED` |
| 71 | `club-application` | `club-application.patch` | **PATCH** | `/api/v1/users/me/applications/{applicationId}/cancel` | `AUTHENTICATED` | /api/v1/users/me/applications/{applicationId}/cancel | `IMPLEMENTED` |
| 72 | `club-application` | `club-application.get` | **GET** | `/api/v1/clubs/{clubId}/applications` | `application.view` | /api/v1/clubs/{clubId}/applications | `IMPLEMENTED` |
| 73 | `club-application` | `club-application.get` | **GET** | `/api/v1/clubs/{clubId}/applications/{applicationId}` | `application.view \| application.view_detail` | /api/v1/clubs/{clubId}/applications/{applicationId} | `IMPLEMENTED` |
| 74 | `club-application` | `club-application.post` | **POST** | `/api/v1/clubs/{clubId}/applications/{applicationId}/approve` | `application.approve \| application.review` | /api/v1/clubs/{clubId}/applications/{applicationId}/approve | `IMPLEMENTED` |
| 75 | `club-application` | `club-application.post` | **POST** | `/api/v1/clubs/{clubId}/applications/{applicationId}/reject` | `application.reject \| application.review` | /api/v1/clubs/{clubId}/applications/{applicationId}/reject | `IMPLEMENTED` |
| 76 | `membership` | `membership.get` | **GET** | `/api/v1/users/me/memberships` | `AUTHENTICATED` | /api/v1/users/me/memberships | `IMPLEMENTED` |
| 77 | `notification` | `notification.get` | **GET** | `/api/v1/users/me/notifications` | `AUTHENTICATED` | /api/v1/users/me/notifications | `IMPLEMENTED` |
| 78 | `notification` | `notification.get` | **GET** | `/api/v1/users/me/notifications/{notificationId}` | `AUTHENTICATED` | /api/v1/users/me/notifications/{notificationId} | `IMPLEMENTED` |
| 79 | `notification` | `notification.patch` | **PATCH** | `/api/v1/users/me/notifications/{notificationId}/read` | `AUTHENTICATED` | /api/v1/users/me/notifications/{notificationId}/read | `IMPLEMENTED` |
| 80 | `document` | `document.get` | **GET** | `/api/v1/clubs/{clubId}/documents` | `document.view` | /api/v1/clubs/{clubId}/documents | `IMPLEMENTED` |
| 81 | `document` | `document.get` | **GET** | `/api/v1/clubs/{clubId}/documents/count` | `document.view` | /api/v1/clubs/{clubId}/documents/count | `IMPLEMENTED` |
| 82 | `document` | `document.get` | **GET** | `/api/v1/clubs/{clubId}/documents/names` | `document.view` | /api/v1/clubs/{clubId}/documents/names | `IMPLEMENTED` |
| 83 | `document` | `document.post` | **POST** | `/api/v1/clubs/{clubId}/documents` | `document.upload` | /api/v1/clubs/{clubId}/documents | `IMPLEMENTED` |
| 84 | `document` | `document.get` | **GET** | `/api/v1/documents/{documentId}` | `document.view` | /api/v1/documents/{documentId} | `IMPLEMENTED` |
| 85 | `document` | `document.patch` | **PATCH** | `/api/v1/documents/{documentId}` | `document.update` | /api/v1/documents/{documentId} | `IMPLEMENTED` |
| 86 | `document` | `document.delete` | **DELETE** | `/api/v1/documents/{documentId}` | `document.delete` | /api/v1/documents/{documentId} | `IMPLEMENTED` |
| 87 | `document` | `document.post` | **POST** | `/api/v1/documents/{documentId}/restore` | `document.restore` | /api/v1/documents/{documentId}/restore | `IMPLEMENTED` |
| 88 | `document` | `document.get` | **GET** | `/api/v1/documents/{documentId}/versions` | `document.view` | /api/v1/documents/{documentId}/versions | `IMPLEMENTED` |
| 89 | `document` | `document.post` | **POST** | `/api/v1/documents/{documentId}/versions` | `document.upload` | /api/v1/documents/{documentId}/versions | `IMPLEMENTED` |
| 90 | `document` | `document.get` | **GET** | `/api/v1/documents/{documentId}/download` | `document.view` | /api/v1/documents/{documentId}/download | `IMPLEMENTED` |
| 91 | `document` | `document.get` | **GET** | `/api/v1/documents/{documentId}/download-url` | `document.view` | /api/v1/documents/{documentId}/download-url | `IMPLEMENTED` |
| 92 | `notification` | `notification.patch` | **PATCH** | `/api/v1/users/me/notifications/read-all` | `AUTHENTICATED` | /api/v1/users/me/notifications/read-all | `IMPLEMENTED` |
| 93 | `notification` | `notification.post` | **POST** | `/api/v1/clubs/{clubId}/notifications` | `notification.send` | /api/v1/clubs/{clubId}/notifications | `IMPLEMENTED` |
| 94 | `event` | `event.get` | **GET** | `/api/v1/public/events` | `PUBLIC` | /api/v1/public/events | `IMPLEMENTED` |
| 95 | `event` | `event.post` | **POST** | `/api/v1/clubs/{clubId}/events` | `event.create` | /api/v1/clubs/{clubId}/events | `IMPLEMENTED` |
| 96 | `event` | `event.get` | **GET** | `/api/v1/clubs/{clubId}/events` | `event.view` | /api/v1/clubs/{clubId}/events | `IMPLEMENTED` |
| 97 | `event` | `event.get` | **GET** | `/api/v1/events/{eventId}` | `event.view` | /api/v1/events/{eventId} | `IMPLEMENTED` |
| 98 | `event` | `event.patch` | **PATCH** | `/api/v1/clubs/{clubId}/events/{eventId}` | `event.update` | /api/v1/clubs/{clubId}/events/{eventId} | `IMPLEMENTED` |
| 99 | `event` | `event.post` | **POST** | `/api/v1/events/{eventId}/registrations` | `AUTHENTICATED` | /api/v1/events/{eventId}/registrations | `IMPLEMENTED` |
| 100 | `event` | `event.get` | **GET** | `/api/v1/events/{eventId}/registrations` | `event.view \| event.attendance` | /api/v1/events/{eventId}/registrations | `IMPLEMENTED` |
| 101 | `event` | `event.patch` | **PATCH** | `/api/v1/events/{eventId}/registrations/{registrationId}` | `event.update` | /api/v1/events/{eventId}/registrations/{registrationId} | `IMPLEMENTED` |
| 102 | `event` | `event.patch` | **PATCH** | `/api/v1/events/{eventId}/registrations/me/cancel` | `AUTHENTICATED` | /api/v1/events/{eventId}/registrations/me/cancel | `IMPLEMENTED` |
| 103 | `event` | `event.get` | **GET** | `/api/v1/users/me/event-registrations` | `AUTHENTICATED` | /api/v1/users/me/event-registrations | `IMPLEMENTED` |
| 104 | `notification` | `notification.post` | **POST** | `/api/v1/events/{eventId}/notifications` | `notification.send \| event.update` | /api/v1/events/{eventId}/notifications | `IMPLEMENTED` |
| 105 | `event` | `event.put` | **PUT** | `/api/v1/events/{eventId}/attendances` | `event.attendance \| event.attendance_edit` | /api/v1/events/{eventId}/attendances | `IMPLEMENTED` |
| 106 | `event` | `event.get` | **GET** | `/api/v1/events/{eventId}/attendances` | `event.attendance \| event.view` | /api/v1/events/{eventId}/attendances | `IMPLEMENTED` |
| 107 | `event` | `event.get` | **GET** | `/api/v1/users/me/calendar` | `AUTHENTICATED` | /api/v1/users/me/calendar | `IMPLEMENTED` |
| 108 | `task` | `task.post` | **POST** | `/api/v1/clubs/{clubId}/tasks` | `task.create` | /api/v1/clubs/{clubId}/tasks | `IMPLEMENTED` |
| 109 | `task` | `task.get` | **GET** | `/api/v1/clubs/{clubId}/tasks` | `task.view` | /api/v1/clubs/{clubId}/tasks | `IMPLEMENTED` |
| 110 | `task` | `task.get` | **GET** | `/api/v1/clubs/{clubId}/tasks/summary` | `task.view` | /api/v1/clubs/{clubId}/tasks/summary | `IMPLEMENTED` |
| 111 | `task` | `task.get` | **GET** | `/api/v1/users/me/tasks` | `AUTHENTICATED` | /api/v1/users/me/tasks | `IMPLEMENTED` |
| 112 | `task` | `task.get` | **GET** | `/api/v1/tasks/{taskId}` | `AUTHENTICATED` | /api/v1/tasks/{taskId} | `IMPLEMENTED` |
| 113 | `task` | `task.patch` | **PATCH** | `/api/v1/tasks/{taskId}` | `task.update \| task.create` | /api/v1/tasks/{taskId} | `IMPLEMENTED` |
| 114 | `notification` | `notification.post` | **POST** | `/api/v1/tasks/{taskId}/notifications` | `notification.send \| task.update \| task.create` | /api/v1/tasks/{taskId}/notifications | `IMPLEMENTED` |
| 115 | `task` | `task.patch` | **PATCH** | `/api/v1/tasks/{taskId}/progress` | `AUTHENTICATED` | /api/v1/tasks/{taskId}/progress | `IMPLEMENTED` |
| 116 | `task` | `task.patch` | **PATCH** | `/api/v1/tasks/{taskId}/verify` | `task.verify` | /api/v1/tasks/{taskId}/verify | `IMPLEMENTED` |
| 117 | `chat` | `chat.post` | **POST** | `/api/v1/clubs/{clubId}/channels` | `chat.send` | /api/v1/clubs/{clubId}/channels | `IMPLEMENTED` |
| 118 | `chat` | `chat.get` | **GET** | `/api/v1/clubs/{clubId}/channels` | `chat.view` | /api/v1/clubs/{clubId}/channels | `IMPLEMENTED` |
| 119 | `chat` | `chat.post` | **POST** | `/api/v1/channels/{channelId}/messages` | `chat.send` | /api/v1/channels/{channelId}/messages | `IMPLEMENTED` |
| 120 | `chat` | `chat.get` | **GET** | `/api/v1/channels/{channelId}/messages` | `chat.view` | /api/v1/channels/{channelId}/messages | `IMPLEMENTED` |
| 121 | `chat` | `chat.post` | **POST** | `/api/v1/channels/{channelId}/summaries` | `chat.summarize` | /api/v1/channels/{channelId}/summaries | `IMPLEMENTED` |
| 122 | `chat` | `chat.get` | **GET** | `/api/v1/channels/{channelId}/summaries` | `chat.view` | /api/v1/channels/{channelId}/summaries | `IMPLEMENTED` |
| 123 | `user-management` | `user-management.delete` | **DELETE** | `/api/v1/users/{userId}` | `user.delete` | /api/v1/users/{userId} | `IMPLEMENTED` |
| 124 | `club-application` | `club-application.get` | **GET** | `/api/v1/clubs/{clubId}/application-form` | `AUTHENTICATED` | /api/v1/clubs/{clubId}/application-form | `IMPLEMENTED` |
| 125 | `club-application` | `club-application.get` | **GET** | `/api/v1/clubs/{clubId}/application-forms` | `application.manage_form \| application.view` | /api/v1/clubs/{clubId}/application-forms | `IMPLEMENTED` |
| 126 | `club-application` | `club-application.post` | **POST** | `/api/v1/clubs/{clubId}/application-forms` | `application.manage_form \| application.review` | /api/v1/clubs/{clubId}/application-forms | `IMPLEMENTED` |
| 127 | `club-application` | `club-application.put` | **PUT** | `/api/v1/clubs/{clubId}/application-forms/{formId}` | `application.manage_form \| application.review` | /api/v1/clubs/{clubId}/application-forms/{formId} | `IMPLEMENTED` |
| 128 | `club-application` | `club-application.delete` | **DELETE** | `/api/v1/clubs/{clubId}/application-forms/{formId}` | `application.manage_form \| application.review` | /api/v1/clubs/{clubId}/application-forms/{formId} | `IMPLEMENTED` |
| 129 | `club-application` | `club-application.post` | **POST** | `/api/v1/clubs/{clubId}/application-forms/{formId}/files` | `application.manage_form \| application.review` | /api/v1/clubs/{clubId}/application-forms/{formId}/files | `IMPLEMENTED` |
| 130 | `club-application` | `club-application.delete` | **DELETE** | `/api/v1/clubs/{clubId}/application-forms/{formId}/files/{fileId}` | `application.manage_form \| application.review` | /api/v1/clubs/{clubId}/application-forms/{formId}/files/{fileId} | `IMPLEMENTED` |
| 131 | `club-application` | `club-application.put` | **PUT** | `/api/v1/users/me/applications/{applicationId}` | `AUTHENTICATED` | /api/v1/users/me/applications/{applicationId} | `IMPLEMENTED` |
| 132 | `club-application` | `club-application.put` | **PUT** | `/api/v1/clubs/{clubId}/applications/{applicationId}` | `application.update \| application.review` | /api/v1/clubs/{clubId}/applications/{applicationId} | `IMPLEMENTED` |
| 133 | `club-application` | `club-application.post` | **POST** | `/api/v1/applications/{applicationId}/files` | `AUTHENTICATED` | /api/v1/applications/{applicationId}/files | `IMPLEMENTED` |
| 134 | `club-application` | `club-application.delete` | **DELETE** | `/api/v1/applications/{applicationId}/files/{fileId}` | `AUTHENTICATED` | /api/v1/applications/{applicationId}/files/{fileId} | `IMPLEMENTED` |
| 135 | `club-application` | `club-application.get` | **GET** | `/api/v1/application-files/{fileId}/download` | `AUTHENTICATED` | /api/v1/application-files/{fileId}/download | `IMPLEMENTED` |
| 136 | `role-management` | `role-management.get` | **GET** | `/api/v1/clubs/{clubId}/positions` | `department.view` | /api/v1/clubs/{clubId}/positions | `IMPLEMENTED` |
| 137 | `role-management` | `role-management.put` | **PUT** | `/api/v1/clubs/{clubId}/positions` | `permission.assign` | /api/v1/clubs/{clubId}/positions | `IMPLEMENTED` |
| 138 | `role-management` | `role-management.delete` | **DELETE** | `/api/v1/clubs/{clubId}/positions/{assignmentId}` | `permission.revoke` | /api/v1/clubs/{clubId}/positions/{assignmentId} | `IMPLEMENTED` |
| 139 | `statistics` | `statistics.get` | **GET** | `/api/v1/statistics/system` | `user.view` | /api/v1/statistics/system | `IMPLEMENTED` |
| 140 | `statistics` | `statistics.get` | **GET** | `/api/v1/clubs/{clubId}/statistics` | `club.view \| member.view` | /api/v1/clubs/{clubId}/statistics | `IMPLEMENTED` |
| 141 | `system` | `system.get` | **GET** | `/api/v1/public/i18n/translations` | `PUBLIC` | /api/v1/public/i18n/translations | `IMPLEMENTED` |
| 142 | `system` | `system.post` | **POST** | `/api/v1/public/i18n/translate-batch` | `PUBLIC` | /api/v1/public/i18n/translate-batch | `IMPLEMENTED` |
| 143 | `club-application` | `club-application.get` | **GET** | `/api/v1/applications/review-summary` | `AUTHENTICATED` | /api/v1/applications/review-summary | `IMPLEMENTED` |

---

## Scope Rules Frontend Must Reflect

- `GLOBAL` grants omit `clubId` and `departmentId`.
- `CLUB` grants include `clubId`; `DEPARTMENT` grants include `departmentId`.
- `permissionId` is the permission-definition ID. A grant ID is returned in `UserPermission.id` and is not accepted in the grant endpoint.
- Revoke calls should send `scope` and its target ID. If more than one active grant matches an underspecified revoke, the backend returns `400 AMBIGUOUS_PERMISSION_GRANT`.
- Status operations choose their permission from the target status: `user.active`/`user.inactive`, `club.active`/`club.inactive`, and `department.activate`/`department.inactive`.
- Department move uses the source department in the URL and `targetDepartmentId` in the body. It requires remove permission at the source and add permission at the target.
- AI Chat Summarizer (`POST /api/v1/channels/{channelId}/summaries`) and AI Multilingual Translation Gateway (`GET /api/v1/public/i18n/translations`, `POST /api/v1/public/i18n/translate-batch`) connect to the configured **9router** OpenAI-compatible gateway (`AI_BASE_URL=https://router.anhchau.all1.vn/v1`, `AI_MODEL=apmarket`) with persistent PostgreSQL caching (`i18n_translations`, Flyway `V23`).
