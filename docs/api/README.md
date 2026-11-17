# VJU Club Management System — Swagger / OpenAPI Inventory (161 Endpoints)

The backend assigned to this system is `backend/springboot` (Spring Boot 4.1.1 / Java 21 / PostgreSQL 16).

## Live Swagger & OpenAPI URLs

| Environment | Swagger UI | OpenAPI 3.1 JSON | Static OpenAPI YAML | Runtime API Catalog |
|---|---|---|---|---|
| **Production (HTTPS)** | `https://api.vju-club.all1.vn/swagger-ui.html` | `https://api.vju-club.all1.vn/v3/api-docs` | `https://api.vju-club.all1.vn/api-docs/phase1.yaml` | `https://api.vju-club.all1.vn/api/v1/api-catalog` |
| **Stagging (HTTPS)** | `https://stagging.vju-club.all1.vn/swagger-ui.html` | `https://stagging.vju-club.all1.vn/v3/api-docs` | `https://stagging.vju-club.all1.vn/api-docs/phase1.yaml` | `https://stagging.vju-club.all1.vn/api/v1/api-catalog` |
| **Local Development** | `http://localhost:8080/swagger-ui.html` | `http://localhost:8080/v3/api-docs` | `http://localhost:8080/api-docs/phase1.yaml` | `http://localhost:8080/api/v1/api-catalog` |

- **Source catalog:** [`docs/api/catalog.yml`](catalog.yml) (synced with `backend/springboot/src/main/resources/api/catalog.yml`)
- **Source OpenAPI contract:** [`docs/api/openapi.yaml`](openapi.yaml) (synced with `backend/springboot/src/main/resources/api/phase1-openapi.yaml`)
- **All 161 endpoints** across **21 modules** are marked `IMPLEMENTED` and verified by automated PostgreSQL integration tests and static OpenAPI 3.1 contract checks (`16/16 Pass`).

## Authentication, Realtime WebSocket & Conventions

- **Authentication:** Send the `CLUB_SESSION` HttpOnly session cookie (plus `X-XSRF-TOKEN` header matching the `XSRF-TOKEN` cookie on unsafe methods `POST/PUT/PATCH/DELETE`) for all protected routes (`PUBLIC` routes do not require a session; `AUTHENTICATED` routes require an active logged-in session). See [ADR-001](../decisions/ADR-001-postgresql-stateful-sessions-and-csrf.md).
- **STOMP over WebSocket (Realtime Chat):** Connect to `/ws/chat` with an active `CLUB_SESSION` cookie, subscribe to `/topic/channels/{channelId}` for live messages, media attachments, read receipts, and pin/unpin events, and publish messages to `/app/channels/{channelId}/send`. Media streams support `HTTP Range` (`206 Partial Content`) via `GET /api/v1/chat-attachments/{attachmentId}/stream`. See [ADR-005](../decisions/ADR-005-realtime-stomp-chat-and-three-tier-document-vault.md).
- **Pagination:** List endpoints use `offset` (default `0`) and `limit` (default `20`, max `100`) and return `{ items, total, offset, limit }` (chat message history additionally supports cursor pagination via `before`).
- **Error Format:** RFC 7807 Problem Details (`application/problem+json`) with a stable `code` property.
- **Contract verification:**
  ```bash
  python3 -m unittest discover -s docs/api/tests -v
  ```

---

## Complete Swagger API Endpoint List (161 Endpoints)

| # | Module | Operation ID | Method | Path | Permission / Auth | Summary | Status |
|---:|---|---|---|---|---|---|---|
| 1 | `system` | `system.apiCatalog` | **GET** | `/api/v1/api-catalog` | `PUBLIC` | List API catalog | `IMPLEMENTED` |
| 2 | `authentication` | `auth.login` | **POST** | `/api/v1/auth/login` | `PUBLIC` | Login | `IMPLEMENTED` |
| 3 | `authentication` | `auth.register` | **POST** | `/api/v1/auth/register` | `PUBLIC` | Self-register a student or member account | `IMPLEMENTED` |
| 4 | `authentication` | `auth.google` | **POST** | `/api/v1/auth/google` | `PUBLIC` | Sign in with a school Google account | `IMPLEMENTED` |
| 5 | `authentication` | `auth.google_config` | **GET** | `/api/v1/auth/google/config` | `PUBLIC` | Google sign-in settings for the login page | `IMPLEMENTED` |
| 6 | `authentication` | `auth.logout` | **POST** | `/api/v1/auth/logout` | `AUTHENTICATED` | Logout | `IMPLEMENTED` |
| 7 | `authentication` | `auth.csrf` | **GET** | `/api/v1/auth/csrf` | `PUBLIC` | Get CSRF cookie | `IMPLEMENTED` |
| 8 | `authentication` | `auth.me` | **GET** | `/api/v1/auth/me` | `AUTHENTICATED` | Get current account | `IMPLEMENTED` |
| 9 | `user-management` | `user.create` | **POST** | `/api/v1/users` | `user.create` | Create account (admin) | `IMPLEMENTED` |
| 10 | `user-profile` | `user.me` | **GET** | `/api/v1/users/me` | `AUTHENTICATED` | Get current profile | `IMPLEMENTED` |
| 11 | `user-profile` | `user.updateMe` | **PATCH** | `/api/v1/users/me` | `AUTHENTICATED` | Update current profile | `IMPLEMENTED` |
| 12 | `user-profile` | `user.list` | **GET** | `/api/v1/users` | `user.view` | List users | `IMPLEMENTED` |
| 13 | `user-profile` | `user.get` | **GET** | `/api/v1/users/{userId}` | `user.view` | Get user | `IMPLEMENTED` |
| 14 | `user-management` | `user.reset_password` | **PATCH** | `/api/v1/users/{userId}/password` | `user.reset_password` | Reset a user password (admin) | `IMPLEMENTED` |
| 15 | `user-profile` | `user.status` | **PATCH** | `/api/v1/users/{userId}/status` | `user.active \| user.inactive` | Update user status | `IMPLEMENTED` |
| 16 | `user-profile` | `user.uploadMyAvatar` | **POST** | `/api/v1/users/me/avatar` | `AUTHENTICATED` | Upload my avatar | `IMPLEMENTED` |
| 17 | `user-profile` | `user.uploadAvatar` | **POST** | `/api/v1/users/{userId}/avatar` | `user.update` | Upload avatar for a user | `IMPLEMENTED` |
| 18 | `club` | `club.listPublic` | **GET** | `/api/v1/public/clubs` | `PUBLIC` | List active clubs publicly | `IMPLEMENTED` |
| 19 | `club` | `club.listPublicCategories` | **GET** | `/api/v1/public/clubs/categories` | `PUBLIC` | List distinct active club categories publicly | `IMPLEMENTED` |
| 20 | `club` | `club.getPublic` | **GET** | `/api/v1/public/clubs/{clubId}` | `PUBLIC` | Get active club publicly | `IMPLEMENTED` |
| 21 | `club` | `club.publicLogo` | **GET** | `/api/v1/public/clubs/{clubId}/logo` | `PUBLIC` | Download public club logo | `IMPLEMENTED` |
| 22 | `user-profile` | `user.publicAvatar` | **GET** | `/api/v1/public/avatars/{fileName}` | `PUBLIC` | Download a user avatar | `IMPLEMENTED` |
| 23 | `club` | `club.publicCover` | **GET** | `/api/v1/public/clubs/{clubId}/cover` | `PUBLIC` | Download public club cover image | `IMPLEMENTED` |
| 24 | `club` | `club.list` | **GET** | `/api/v1/clubs` | `club.view` | List clubs | `IMPLEMENTED` |
| 25 | `club` | `club.get` | **GET** | `/api/v1/clubs/{clubId}` | `club.view` | Get club | `IMPLEMENTED` |
| 26 | `club` | `club.create` | **POST** | `/api/v1/clubs` | `club.create` | Create club | `IMPLEMENTED` |
| 27 | `club` | `club.update` | **PATCH** | `/api/v1/clubs/{clubId}` | `club.update` | Update club | `IMPLEMENTED` |
| 28 | `club` | `club.status` | **PATCH** | `/api/v1/clubs/{clubId}/status` | `club.active \| club.inactive` | Update club status | `IMPLEMENTED` |
| 29 | `club` | `club.uploadLogo` | **POST** | `/api/v1/clubs/{clubId}/logo` | `club.update` | Upload club logo | `IMPLEMENTED` |
| 30 | `club` | `club.uploadCover` | **POST** | `/api/v1/clubs/{clubId}/cover` | `club.update` | Upload club cover image | `IMPLEMENTED` |
| 31 | `department` | `department.list` | **GET** | `/api/v1/clubs/{clubId}/departments` | `department.view` | List departments | `IMPLEMENTED` |
| 32 | `department` | `department.get` | **GET** | `/api/v1/departments/{departmentId}` | `department.view` | Get department | `IMPLEMENTED` |
| 33 | `department` | `department.create` | **POST** | `/api/v1/clubs/{clubId}/departments` | `department.create` | Create department | `IMPLEMENTED` |
| 34 | `department` | `department.update` | **PATCH** | `/api/v1/departments/{departmentId}` | `department.update` | Update department | `IMPLEMENTED` |
| 35 | `department` | `department.status` | **PATCH** | `/api/v1/departments/{departmentId}/status` | `department.activate \| department.inactive` | Update department status | `IMPLEMENTED` |
| 36 | `membership` | `membership.list` | **GET** | `/api/v1/clubs/{clubId}/memberships` | `member.view` | List club memberships | `IMPLEMENTED` |
| 37 | `membership` | `membership.get` | **GET** | `/api/v1/memberships/{membershipId}` | `member.view_detail` | Get membership | `IMPLEMENTED` |
| 38 | `membership` | `membership.add` | **POST** | `/api/v1/clubs/{clubId}/memberships` | `member.add` | Add member | `IMPLEMENTED` |
| 39 | `membership` | `membership.update` | **PATCH** | `/api/v1/memberships/{membershipId}` | `member.update` | Update membership | `IMPLEMENTED` |
| 40 | `membership` | `membership.remove` | **DELETE** | `/api/v1/memberships/{membershipId}` | `member.remove` | Remove member | `IMPLEMENTED` |
| 41 | `department-member` | `departmentMember.list` | **GET** | `/api/v1/departments/{departmentId}/members` | `department.member.view` | List department members | `IMPLEMENTED` |
| 42 | `department-member` | `departmentMember.add` | **POST** | `/api/v1/departments/{departmentId}/members` | `department.member.add` | Assign department member | `IMPLEMENTED` |
| 43 | `department-member` | `departmentMember.remove` | **DELETE** | `/api/v1/departments/{departmentId}/members/{membershipId}` | `department.member.remove` | Remove department member | `IMPLEMENTED` |
| 44 | `permission-management` | `permission.list` | **GET** | `/api/v1/permissions` | `permission.view` | List permission catalog | `IMPLEMENTED` |
| 45 | `permission-management` | `permission.grant` | **POST** | `/api/v1/users/{userId}/permissions` | `permission.assign` | Grant permission | `IMPLEMENTED` |
| 46 | `permission-management` | `permission.revoke` | **DELETE** | `/api/v1/users/{userId}/permissions/{permissionId}` | `permission.revoke` | Revoke permission | `IMPLEMENTED` |
| 47 | `user-management` | `user.update` | **PATCH** | `/api/v1/users/{userId}` | `user.update` | Update a user profile (admin) | `IMPLEMENTED` |
| 48 | `permission-management` | `permission.revoke_by_key` | **DELETE** | `/api/v1/users/{userId}/permissions/by-key/{permissionKey}` | `permission.revoke` | Revoke permission by key | `IMPLEMENTED` |
| 49 | `authentication` | `auth.changePassword` | **POST** | `/api/v1/auth/change-password` | `AUTHENTICATED` | Change password | `IMPLEMENTED` |
| 50 | `permission-management` | `user.permissions` | **GET** | `/api/v1/users/me/permissions` | `AUTHENTICATED` | List current permissions | `IMPLEMENTED` |
| 51 | `permission-management` | `permission.userList` | **GET** | `/api/v1/users/{userId}/permissions` | `permission.view` | List user permission grants | `IMPLEMENTED` |
| 52 | `department-member` | `departmentMember.move` | **PATCH** | `/api/v1/departments/{departmentId}/members/{membershipId}` | `department.member.remove & department.member.add` | Move department member | `IMPLEMENTED` |
| 53 | `role-management` | `role.list` | **GET** | `/api/v1/roles` | `role.view` | List roles | `IMPLEMENTED` |
| 54 | `role-management` | `role.create` | **POST** | `/api/v1/roles` | `role.manage` | Create custom role | `IMPLEMENTED` |
| 55 | `role-management` | `role.get` | **GET** | `/api/v1/roles/{roleId}` | `role.view` | Get role | `IMPLEMENTED` |
| 56 | `role-management` | `role.update` | **PATCH** | `/api/v1/roles/{roleId}` | `role.manage` | Update custom role | `IMPLEMENTED` |
| 57 | `role-management` | `role.ownAssignments` | **GET** | `/api/v1/users/me/roles` | `AUTHENTICATED` | List own role assignments | `IMPLEMENTED` |
| 58 | `role-management` | `role.userAssignments` | **GET** | `/api/v1/users/{userId}/roles` | `permission.view` | List user role assignments | `IMPLEMENTED` |
| 59 | `role-management` | `role.assign` | **POST** | `/api/v1/users/{userId}/roles` | `permission.assign` | Assign role | `IMPLEMENTED` |
| 60 | `role-management` | `role.revoke` | **DELETE** | `/api/v1/users/{userId}/roles/{assignmentId}` | `permission.revoke` | Revoke role assignment | `IMPLEMENTED` |
| 61 | `permission-management` | `permission.ownEffective` | **GET** | `/api/v1/users/me/effective-permissions` | `AUTHENTICATED` | List own effective permissions | `IMPLEMENTED` |
| 62 | `permission-management` | `permission.userEffective` | **GET** | `/api/v1/users/{userId}/effective-permissions` | `permission.view` | List user effective permissions | `IMPLEMENTED` |
| 63 | `permission-management` | `permission.groups` | **GET** | `/api/v1/permissions/groups` | `permission.view` | List permissions grouped by module | `IMPLEMENTED` |
| 64 | `permission-management` | `permission.replace` | **PUT** | `/api/v1/users/{userId}/permissions` | `permission.assign` | Replace user permissions at one scope | `IMPLEMENTED` |
| 65 | `setting` | `systemSettings.get` | **GET** | `/api/v1/system-settings` | `setting.view` | Read system-wide limits | `IMPLEMENTED` |
| 66 | `setting` | `systemSettings.update` | **PUT** | `/api/v1/system-settings` | `setting.update` | Change system-wide limits | `IMPLEMENTED` |
| 67 | `audit` | `audit.list` | **GET** | `/api/v1/audit-logs` | `audit.view` | Search the audit log | `IMPLEMENTED` |
| 68 | `club-application` | `clubApplication.create` | **POST** | `/api/v1/clubs/{clubId}/applications` | `AUTHENTICATED` | Submit a club application | `IMPLEMENTED` |
| 69 | `club-application` | `clubApplication.listMine` | **GET** | `/api/v1/users/me/applications` | `AUTHENTICATED` | List my club applications | `IMPLEMENTED` |
| 70 | `club-application` | `clubApplication.reviewSummary` | **GET** | `/api/v1/applications/review-summary` | `AUTHENTICATED` | Count applications by status for clubs I review | `IMPLEMENTED` |
| 71 | `club-application` | `clubApplication.getMine` | **GET** | `/api/v1/users/me/applications/{applicationId}` | `AUTHENTICATED` | Get my club application | `IMPLEMENTED` |
| 72 | `club-application` | `clubApplication.cancel` | **PATCH** | `/api/v1/users/me/applications/{applicationId}/cancel` | `AUTHENTICATED` | Cancel a pending club application | `IMPLEMENTED` |
| 73 | `club-application` | `clubApplication.listForClub` | **GET** | `/api/v1/clubs/{clubId}/applications` | `application.view` | List club applications | `IMPLEMENTED` |
| 74 | `club-application` | `clubApplication.getForClub` | **GET** | `/api/v1/clubs/{clubId}/applications/{applicationId}` | `application.view \| application.view_detail` | Get a club application | `IMPLEMENTED` |
| 75 | `club-application` | `clubApplication.approve` | **POST** | `/api/v1/clubs/{clubId}/applications/{applicationId}/approve` | `application.approve \| application.review` | Approve a club application and create membership | `IMPLEMENTED` |
| 76 | `club-application` | `clubApplication.reject` | **POST** | `/api/v1/clubs/{clubId}/applications/{applicationId}/reject` | `application.reject \| application.review` | Reject a club application | `IMPLEMENTED` |
| 77 | `membership` | `membership.listMine` | **GET** | `/api/v1/users/me/memberships` | `AUTHENTICATED` | List my club membership history | `IMPLEMENTED` |
| 78 | `notification` | `notification.listMine` | **GET** | `/api/v1/users/me/notifications` | `AUTHENTICATED` | List my in-app notifications | `IMPLEMENTED` |
| 79 | `notification` | `notification.getMine` | **GET** | `/api/v1/users/me/notifications/{notificationId}` | `AUTHENTICATED` | Get a single notification owned by current user | `IMPLEMENTED` |
| 80 | `notification` | `notification.markRead` | **PATCH** | `/api/v1/users/me/notifications/{notificationId}/read` | `AUTHENTICATED` | Mark my notification as read | `IMPLEMENTED` |
| 81 | `document` | `document.list` | **GET** | `/api/v1/clubs/{clubId}/documents` | `document.view` | List club documents | `IMPLEMENTED` |
| 82 | `document` | `document.count` | **GET** | `/api/v1/clubs/{clubId}/documents/count` | `document.view` | Count club documents | `IMPLEMENTED` |
| 83 | `document` | `document.names` | **GET** | `/api/v1/clubs/{clubId}/documents/names` | `document.view` | List document names | `IMPLEMENTED` |
| 84 | `document` | `document.upload` | **POST** | `/api/v1/clubs/{clubId}/documents` | `document.upload` | Upload a document | `IMPLEMENTED` |
| 85 | `document` | `document.get` | **GET** | `/api/v1/documents/{documentId}` | `document.view` | Get a document | `IMPLEMENTED` |
| 86 | `document` | `document.update` | **PATCH** | `/api/v1/documents/{documentId}` | `document.update` | Rename a document | `IMPLEMENTED` |
| 87 | `document` | `document.delete` | **DELETE** | `/api/v1/documents/{documentId}` | `document.delete` | Soft-delete a document | `IMPLEMENTED` |
| 88 | `document` | `document.restore` | **POST** | `/api/v1/documents/{documentId}/restore` | `document.restore` | Restore a deleted document | `IMPLEMENTED` |
| 89 | `document` | `document.versions` | **GET** | `/api/v1/documents/{documentId}/versions` | `document.view` | List document versions | `IMPLEMENTED` |
| 90 | `document` | `document.upload_version` | **POST** | `/api/v1/documents/{documentId}/versions` | `document.upload` | Upload a new version | `IMPLEMENTED` |
| 91 | `document` | `document.download` | **GET** | `/api/v1/documents/{documentId}/download` | `document.view` | Download a document | `IMPLEMENTED` |
| 92 | `document` | `document.download_url` | **GET** | `/api/v1/documents/{documentId}/download-url` | `document.view` | Get a presigned download link | `IMPLEMENTED` |
| 93 | `notification` | `notification.markAllRead` | **PATCH** | `/api/v1/users/me/notifications/read-all` | `AUTHENTICATED` | Mark all my notifications as read | `IMPLEMENTED` |
| 94 | `notification` | `notification.broadcast` | **POST** | `/api/v1/clubs/{clubId}/notifications` | `notification.send` | Broadcast notification to club or department members | `IMPLEMENTED` |
| 95 | `event` | `event.listPublic` | **GET** | `/api/v1/public/events` | `PUBLIC` | List public club events on landing page | `IMPLEMENTED` |
| 96 | `event` | `event.create` | **POST** | `/api/v1/clubs/{clubId}/events` | `event.create` | Create a club event or schedule | `IMPLEMENTED` |
| 97 | `event` | `event.list` | **GET** | `/api/v1/clubs/{clubId}/events` | `event.view` | List club events | `IMPLEMENTED` |
| 98 | `event` | `event.get` | **GET** | `/api/v1/events/{eventId}` | `event.view` | Get an event | `IMPLEMENTED` |
| 99 | `event` | `event.update` | **PATCH** | `/api/v1/clubs/{clubId}/events/{eventId}` | `event.update` | Update an event | `IMPLEMENTED` |
| 100 | `event` | `event.register` | **POST** | `/api/v1/events/{eventId}/registrations` | `AUTHENTICATED` | Register current user for an event | `IMPLEMENTED` |
| 101 | `event` | `event.listRegistrations` | **GET** | `/api/v1/events/{eventId}/registrations` | `event.view \| event.attendance` | List event registrations | `IMPLEMENTED` |
| 102 | `event` | `event.updateRegistration` | **PATCH** | `/api/v1/events/{eventId}/registrations/{registrationId}` | `event.update` | Update participant event role or registration status | `IMPLEMENTED` |
| 103 | `event` | `event.cancelRegistration` | **PATCH** | `/api/v1/events/{eventId}/registrations/me/cancel` | `AUTHENTICATED` | Cancel my event registration | `IMPLEMENTED` |
| 104 | `event` | `event.listMyRegistrations` | **GET** | `/api/v1/users/me/event-registrations` | `AUTHENTICATED` | List my event registrations, roles, and attendance results | `IMPLEMENTED` |
| 105 | `notification` | `notification.notifyEventParticipants` | **POST** | `/api/v1/events/{eventId}/notifications` | `notification.send \| event.update` | Send notification to all registered Member and CTV participants of an event | `IMPLEMENTED` |
| 106 | `event` | `event.recordAttendance` | **PUT** | `/api/v1/events/{eventId}/attendances` | `event.attendance \| event.attendance_edit` | Record or adjust event attendance | `IMPLEMENTED` |
| 107 | `event` | `event.listAttendances` | **GET** | `/api/v1/events/{eventId}/attendances` | `event.attendance \| event.view` | List event attendance records | `IMPLEMENTED` |
| 108 | `event` | `event.myCalendar` | **GET** | `/api/v1/users/me/calendar` | `AUTHENTICATED` | List my upcoming and scheduled club events | `IMPLEMENTED` |
| 109 | `task` | `task.create` | **POST** | `/api/v1/clubs/{clubId}/tasks` | `task.create` | Create and assign a task | `IMPLEMENTED` |
| 110 | `task` | `task.list` | **GET** | `/api/v1/clubs/{clubId}/tasks` | `task.view` | List club tasks | `IMPLEMENTED` |
| 111 | `task` | `task.summarize` | **GET** | `/api/v1/clubs/{clubId}/tasks/summary` | `task.view` | Summarize club task counts matching active filters | `IMPLEMENTED` |
| 112 | `task` | `task.listMine` | **GET** | `/api/v1/users/me/tasks` | `AUTHENTICATED` | List my assigned tasks | `IMPLEMENTED` |
| 113 | `task` | `task.get` | **GET** | `/api/v1/tasks/{taskId}` | `AUTHENTICATED` | Get task detail | `IMPLEMENTED` |
| 114 | `task` | `task.update` | **PATCH** | `/api/v1/tasks/{taskId}` | `task.update \| task.create` | Reassign task, adjust deadline/priority, or reopen task | `IMPLEMENTED` |
| 115 | `notification` | `notification.notifyTaskAssignees` | **POST** | `/api/v1/tasks/{taskId}/notifications` | `notification.send \| task.update \| task.create` | Send notification to task assignee (and optional open subtask assignees) | `IMPLEMENTED` |
| 116 | `task` | `task.updateProgress` | **PATCH** | `/api/v1/tasks/{taskId}/progress` | `AUTHENTICATED` | Update task progress by assignee | `IMPLEMENTED` |
| 117 | `task` | `task.verify` | **PATCH** | `/api/v1/tasks/{taskId}/verify` | `task.verify` | Verify a completed task (DONE -> COMPLETED) | `IMPLEMENTED` |
| 118 | `chat` | `chat.createChannel` | **POST** | `/api/v1/clubs/{clubId}/channels` | `chat.send` | Create a club or department chat channel | `IMPLEMENTED` |
| 119 | `chat` | `chat.listChannels` | **GET** | `/api/v1/clubs/{clubId}/channels` | `chat.view` | List club chat channels | `IMPLEMENTED` |
| 120 | `chat` | `chat.sendMessage` | **POST** | `/api/v1/channels/{channelId}/messages` | `chat.send` | Send a message to a chat channel | `IMPLEMENTED` |
| 121 | `chat` | `chat.listMessages` | **GET** | `/api/v1/channels/{channelId}/messages` | `chat.view` | List messages in a chat channel | `IMPLEMENTED` |
| 122 | `chat` | `chat.listPinnedMessages` | **GET** | `/api/v1/channels/{channelId}/pinned-messages` | `chat.view` | List pinned messages in a chat channel | `IMPLEMENTED` |
| 123 | `chat` | `chat.pinMessage` | **POST** | `/api/v1/channels/{channelId}/messages/{messageId}/pin` | `chat.send` | Pin a message in a chat channel | `IMPLEMENTED` |
| 124 | `chat` | `chat.unpinMessage` | **DELETE** | `/api/v1/channels/{channelId}/messages/{messageId}/pin` | `chat.send` | Unpin a message in a chat channel | `IMPLEMENTED` |
| 125 | `chat` | `chat.summarize` | **POST** | `/api/v1/channels/{channelId}/summaries` | `chat.summarize` | Summarize channel messages with AI Bot | `IMPLEMENTED` |
| 126 | `chat` | `chat.listSummaries` | **GET** | `/api/v1/channels/{channelId}/summaries` | `chat.view` | List AI summaries for a channel | `IMPLEMENTED` |
| 127 | `user-management` | `user.delete` | **DELETE** | `/api/v1/users/{userId}` | `user.delete` | Delete or anonymize a user account (admin) | `IMPLEMENTED` |
| 128 | `club-application` | `clubApplicationForm.getActive` | **GET** | `/api/v1/clubs/{clubId}/application-form` | `AUTHENTICATED` | Get active application form for a club | `IMPLEMENTED` |
| 129 | `club-application` | `clubApplicationForm.list` | **GET** | `/api/v1/clubs/{clubId}/application-forms` | `application.manage_form \| application.view` | List application forms of a club | `IMPLEMENTED` |
| 130 | `club-application` | `clubApplicationForm.create` | **POST** | `/api/v1/clubs/{clubId}/application-forms` | `application.manage_form \| application.review` | Create an application form for a club | `IMPLEMENTED` |
| 131 | `club-application` | `clubApplicationForm.update` | **PUT** | `/api/v1/clubs/{clubId}/application-forms/{formId}` | `application.manage_form \| application.review` | Update a club application form | `IMPLEMENTED` |
| 132 | `club-application` | `clubApplicationForm.delete` | **DELETE** | `/api/v1/clubs/{clubId}/application-forms/{formId}` | `application.manage_form \| application.review` | Delete a club application form | `IMPLEMENTED` |
| 133 | `club-application` | `clubApplicationForm.uploadFile` | **POST** | `/api/v1/clubs/{clubId}/application-forms/{formId}/files` | `application.manage_form \| application.review` | Upload a template file to an application form | `IMPLEMENTED` |
| 134 | `club-application` | `clubApplicationForm.deleteFile` | **DELETE** | `/api/v1/clubs/{clubId}/application-forms/{formId}/files/{fileId}` | `application.manage_form \| application.review` | Delete a template file from an application form | `IMPLEMENTED` |
| 135 | `club-application` | `clubApplication.updateMine` | **PUT** | `/api/v1/users/me/applications/{applicationId}` | `AUTHENTICATED` | Update my pending club application | `IMPLEMENTED` |
| 136 | `club-application` | `clubApplication.updateForClub` | **PUT** | `/api/v1/clubs/{clubId}/applications/{applicationId}` | `application.update \| application.review` | Update club application details or notes (club reviewer) | `IMPLEMENTED` |
| 137 | `club-application` | `clubApplication.uploadFile` | **POST** | `/api/v1/applications/{applicationId}/files` | `AUTHENTICATED` | Upload an attachment to a club application | `IMPLEMENTED` |
| 138 | `club-application` | `clubApplication.deleteFile` | **DELETE** | `/api/v1/applications/{applicationId}/files/{fileId}` | `AUTHENTICATED` | Delete an attachment from a club application | `IMPLEMENTED` |
| 139 | `club-application` | `clubApplication.downloadFile` | **GET** | `/api/v1/application-files/{fileId}/download` | `AUTHENTICATED` | Download an application or form attachment | `IMPLEMENTED` |
| 140 | `role-management` | `role.getClubStructure` | **GET** | `/api/v1/clubs/{clubId}/positions` | `department.view` | Get club organizational leadership structure (PB-14.1, PB-14.2) | `IMPLEMENTED` |
| 141 | `role-management` | `role.assignClubPosition` | **PUT** | `/api/v1/clubs/{clubId}/positions` | `permission.assign` | Assign or replace club/department leadership position (PB-14.1, PB-14.2) | `IMPLEMENTED` |
| 142 | `role-management` | `role.revokeClubPosition` | **DELETE** | `/api/v1/clubs/{clubId}/positions/{assignmentId}` | `permission.revoke` | Revoke club or department leadership position | `IMPLEMENTED` |
| 143 | `statistics` | `statistics.system` | **GET** | `/api/v1/statistics/system` | `user.view` | System-wide account, club, and active role statistics | `IMPLEMENTED` |
| 144 | `statistics` | `statistics.club` | **GET** | `/api/v1/clubs/{clubId}/statistics` | `club.view \| member.view` | Club operational statistics with time-range filtering | `IMPLEMENTED` |
| 145 | `system` | `i18n.listPublicTranslations` | **GET** | `/api/v1/public/i18n/translations` | `PUBLIC` | Get cached dynamic translations for a target locale | `IMPLEMENTED` |
| 146 | `system` | `i18n.translateBatch` | **POST** | `/api/v1/public/i18n/translate-batch` | `PUBLIC` | Translate a batch of Vietnamese strings via 9router AI and store in PostgreSQL | `IMPLEMENTED` |
| 147 | `document-vault` | `document.list_system` | **GET** | `/api/v1/system/documents` | `AUTHENTICATED` | List centralized system-level documents | `IMPLEMENTED` |
| 148 | `document-vault` | `document.upload_system` | **POST** | `/api/v1/system/documents` | `document.upload` | Upload a centralized system-level document | `IMPLEMENTED` |
| 149 | `document-vault` | `document.preview` | **GET** | `/api/v1/documents/{documentId}/preview` | `document.view` | Preview a document inline through backend proxy | `IMPLEMENTED` |
| 150 | `chat-realtime` | `chat.mark_read` | **POST** | `/api/v1/channels/{channelId}/read` | `chat.view` | Mark channel messages as read | `IMPLEMENTED` |
| 151 | `chat-realtime` | `chat.uploadAttachment` | **POST** | `/api/v1/channels/{channelId}/attachments` | `chat.send` | Upload image, video, or file attachment to chat channel | `IMPLEMENTED` |
| 152 | `chat-realtime` | `chat.streamAttachment` | **GET** | `/api/v1/chat-attachments/{attachmentId}/stream` | `chat.view` | Stream or download chat attachment with ETag and HTTP 206 byte-range support | `IMPLEMENTED` |
| 153 | `chat-realtime` | `chat.listQuickReplies` | **GET** | `/api/v1/clubs/{clubId}/quick-replies` | `chat.view` | List quick reply templates for a club | `IMPLEMENTED` |
| 154 | `chat-realtime` | `chat.createQuickReply` | **POST** | `/api/v1/clubs/{clubId}/quick-replies` | `chat.send` | Create a quick reply template for a club | `IMPLEMENTED` |
| 155 | `chat-realtime` | `chat.updateQuickReply` | **PUT** | `/api/v1/clubs/{clubId}/quick-replies/{replyId}` | `chat.send` | Update a quick reply template | `IMPLEMENTED` |
| 156 | `chat-realtime` | `chat.deleteQuickReply` | **DELETE** | `/api/v1/clubs/{clubId}/quick-replies/{replyId}` | `chat.send` | Delete a quick reply template | `IMPLEMENTED` |
| 157 | `notification` | `notification.unreadSummary` | **GET** | `/api/v1/users/me/notifications/unread-summary` | `AUTHENTICATED` | Get total unread notifications and unread chat messages across clubs | `IMPLEMENTED` |
| 158 | `chat-realtime` | `chat.toggleReaction` | **PUT** | `/api/v1/channels/{channelId}/messages/{messageId}/reactions` | `chat.send` | Toggle emoji reaction on a chat message | `IMPLEMENTED` |
| 159 | `authentication` | `auth.forgotPassword` | **POST** | `/api/v1/auth/forgot-password` | `PUBLIC` | Request a 6-digit OTP password reset code via email | `IMPLEMENTED` |
| 160 | `authentication` | `auth.resetPassword` | **POST** | `/api/v1/auth/reset-password` | `PUBLIC` | Verify 6-digit OTP and set a new password | `IMPLEMENTED` |
| 161 | `setting` | `systemSettings.testSmtp` | **PUT** | `/api/v1/system-settings/smtp-test` | `setting.update` | Send a branded 3-tone test OTP email using configured SMTP settings | `IMPLEMENTED` |

---

## Scope Rules Frontend Must Reflect

- `GLOBAL` grants omit `clubId` and `departmentId`.
- `CLUB` grants include `clubId`; `DEPARTMENT` grants include `departmentId`.
- `permissionId` is the permission-definition ID. A grant ID is returned in `UserPermission.id` and is not accepted in the grant endpoint.
- Revoke calls should send `scope` and its target ID. If more than one active grant matches an underspecified revoke, the backend returns `400 AMBIGUOUS_PERMISSION_GRANT`.
- Status operations choose their permission from the target status: `user.active`/`user.inactive`, `club.active`/`club.inactive`, and `department.activate`/`department.inactive`.
- Department move uses the source department in the URL and `targetDepartmentId` in the body. It requires remove permission at the source and add permission at the target.
- 3-tier Document Vault (`SYSTEM`, `CLUB`, `DEPARTMENT`) validates `scope`, `clubId`, `departmentId`, and `visibility` (`PUBLIC_INTERNAL`, `OFFICERS`, `MEMBERS`, `DEPARTMENT_ONLY`).
- AI Chat Summarizer (`POST /api/v1/channels/{channelId}/summaries`) and AI Multilingual Translation Gateway (`GET /api/v1/public/i18n/translations`, `POST /api/v1/public/i18n/translate-batch`) connect to the configured **9router** OpenAI-compatible gateway (`AI_BASE_URL=https://router.anhchau.all1.vn/v1`, `AI_MODEL=apmarket`) with persistent PostgreSQL caching (`i18n_translations`, Flyway `V23`).
