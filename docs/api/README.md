# VJU Club Management System — Swagger / OpenAPI Inventory (123 Endpoints)

The backend assigned to this system is `backend/springboot` (Spring Boot 3 / Java 21 / PostgreSQL 16).

## Live Swagger & OpenAPI URLs

| Environment | Swagger UI | OpenAPI 3.1 JSON | Static OpenAPI YAML | Runtime API Catalog |
|---|---|---|---|---|
| **Production (VPS)** | `http://160.22.123.184:8080/swagger-ui.html` | `http://160.22.123.184:8080/v3/api-docs` | `http://160.22.123.184:8080/api-docs/phase1.yaml` | `http://160.22.123.184:8080/api/v1/api-catalog` |
| **Local Development** | `http://localhost:8080/swagger-ui.html` | `http://localhost:8080/v3/api-docs` | `http://localhost:8080/api-docs/phase1.yaml` | `http://localhost:8080/api/v1/api-catalog` |

- **Source catalog:** [`docs/api/catalog.yml`](catalog.yml) (synced with `backend/springboot/src/main/resources/api/catalog.yml`)
- **Source OpenAPI contract:** [`docs/api/openapi.yaml`](openapi.yaml) (synced with `backend/springboot/src/main/resources/api/phase1-openapi.yaml`)
- **All 123 endpoints** across **18 modules** are marked `IMPLEMENTED` and verified by automated PostgreSQL integration tests.

## Authentication & Conventions

- **Authentication:** Send the `CLUB_SESSION` HttpOnly session cookie (plus `X-XSRF-TOKEN` header matching the `XSRF-TOKEN` cookie on unsafe methods `POST/PUT/PATCH/DELETE`) for all protected routes (`PUBLIC` routes do not require a session; `AUTHENTICATED` routes require an active logged-in session).
- **Pagination:** List endpoints use `offset` (default `0`) and `limit` (default `20`, max `100`) and return `{ items, total, offset, limit }`.
- **Error Format:** RFC 7807 Problem Details (`application/problem+json`) with a stable `code` property.
- **Contract verification:**
  ```bash
  python3 -m unittest discover -s docs/api/tests -v
  ```

---

## Complete Swagger API Endpoint List (123 Endpoints)

| # | Module | Operation ID | Method | Path | Permission / Auth | Summary | Status |
|---:|---|---|---|---|---|---|---|
| 1 | `system` | `system.apiCatalog` | **GET** | `/api/v1/api-catalog` | `PUBLIC` | List API catalog | `IMPLEMENTED` |
| 2 | `authentication` | `auth.login` | **POST** | `/api/v1/auth/login` | `PUBLIC` | Login | `IMPLEMENTED` |
| 3 | `authentication` | `auth.google` | **POST** | `/api/v1/auth/google` | `PUBLIC` | Sign in with a school Google account | `IMPLEMENTED` |
| 4 | `authentication` | `auth.google_config` | **GET** | `/api/v1/auth/google/config` | `PUBLIC` | Google sign-in settings for the login page | `IMPLEMENTED` |
| 5 | `authentication` | `auth.logout` | **POST** | `/api/v1/auth/logout` | `AUTHENTICATED` | Logout | `IMPLEMENTED` |
| 6 | `authentication` | `auth.csrf` | **GET** | `/api/v1/auth/csrf` | `PUBLIC` | Get CSRF cookie | `IMPLEMENTED` |
| 7 | `authentication` | `auth.me` | **GET** | `/api/v1/auth/me` | `AUTHENTICATED` | Get current account | `IMPLEMENTED` |
| 8 | `user-management` | `user.create` | **POST** | `/api/v1/users` | `user.create` | Create account (admin) | `IMPLEMENTED` |
| 9 | `user-profile` | `user.me` | **GET** | `/api/v1/users/me` | `AUTHENTICATED` | Get current profile | `IMPLEMENTED` |
| 10 | `user-profile` | `user.updateMe` | **PATCH** | `/api/v1/users/me` | `AUTHENTICATED` | Update current profile | `IMPLEMENTED` |
| 11 | `user-profile` | `user.list` | **GET** | `/api/v1/users` | `user.view` | List users | `IMPLEMENTED` |
| 12 | `user-profile` | `user.get` | **GET** | `/api/v1/users/{userId}` | `user.view` | Get user | `IMPLEMENTED` |
| 13 | `user-management` | `user.reset_password` | **PATCH** | `/api/v1/users/{userId}/password` | `user.reset_password` | Reset a user password (admin) | `IMPLEMENTED` |
| 14 | `user-profile` | `user.status` | **PATCH** | `/api/v1/users/{userId}/status` | `user.active \| user.inactive` | Update user status | `IMPLEMENTED` |
| 15 | `club` | `club.listPublic` | **GET** | `/api/v1/public/clubs` | `PUBLIC` | List active clubs publicly | `IMPLEMENTED` |
| 16 | `club` | `club.listPublicCategories` | **GET** | `/api/v1/public/clubs/categories` | `PUBLIC` | List distinct active club categories publicly | `IMPLEMENTED` |
| 17 | `club` | `club.getPublic` | **GET** | `/api/v1/public/clubs/{clubId}` | `PUBLIC` | Get active club publicly | `IMPLEMENTED` |
| 18 | `club` | `club.list` | **GET** | `/api/v1/clubs` | `club.view` | List clubs | `IMPLEMENTED` |
| 19 | `club` | `club.get` | **GET** | `/api/v1/clubs/{clubId}` | `club.view` | Get club | `IMPLEMENTED` |
| 20 | `club` | `club.create` | **POST** | `/api/v1/clubs` | `club.create` | Create club | `IMPLEMENTED` |
| 21 | `club` | `club.update` | **PATCH** | `/api/v1/clubs/{clubId}` | `club.update` | Update club | `IMPLEMENTED` |
| 22 | `club` | `club.status` | **PATCH** | `/api/v1/clubs/{clubId}/status` | `club.active \| club.inactive` | Update club status | `IMPLEMENTED` |
| 23 | `department` | `department.list` | **GET** | `/api/v1/clubs/{clubId}/departments` | `department.view` | List departments | `IMPLEMENTED` |
| 24 | `department` | `department.get` | **GET** | `/api/v1/departments/{departmentId}` | `department.view` | Get department | `IMPLEMENTED` |
| 25 | `department` | `department.create` | **POST** | `/api/v1/clubs/{clubId}/departments` | `department.create` | Create department | `IMPLEMENTED` |
| 26 | `department` | `department.update` | **PATCH** | `/api/v1/departments/{departmentId}` | `department.update` | Update department | `IMPLEMENTED` |
| 27 | `department` | `department.status` | **PATCH** | `/api/v1/departments/{departmentId}/status` | `department.activate \| department.inactive` | Update department status | `IMPLEMENTED` |
| 28 | `membership` | `membership.list` | **GET** | `/api/v1/clubs/{clubId}/memberships` | `member.view` | List club memberships | `IMPLEMENTED` |
| 29 | `membership` | `membership.get` | **GET** | `/api/v1/memberships/{membershipId}` | `member.view_detail` | Get membership | `IMPLEMENTED` |
| 30 | `membership` | `membership.add` | **POST** | `/api/v1/clubs/{clubId}/memberships` | `member.add` | Add member | `IMPLEMENTED` |
| 31 | `membership` | `membership.update` | **PATCH** | `/api/v1/memberships/{membershipId}` | `member.update` | Update membership | `IMPLEMENTED` |
| 32 | `membership` | `membership.remove` | **DELETE** | `/api/v1/memberships/{membershipId}` | `member.remove` | Remove member | `IMPLEMENTED` |
| 33 | `department-member` | `departmentMember.list` | **GET** | `/api/v1/departments/{departmentId}/members` | `department.member.view` | List department members | `IMPLEMENTED` |
| 34 | `department-member` | `departmentMember.add` | **POST** | `/api/v1/departments/{departmentId}/members` | `department.member.add` | Assign department member | `IMPLEMENTED` |
| 35 | `department-member` | `departmentMember.remove` | **DELETE** | `/api/v1/departments/{departmentId}/members/{membershipId}` | `department.member.remove` | Remove department member | `IMPLEMENTED` |
| 36 | `permission-management` | `permission.list` | **GET** | `/api/v1/permissions` | `permission.view` | List permission catalog | `IMPLEMENTED` |
| 37 | `permission-management` | `permission.grant` | **POST** | `/api/v1/users/{userId}/permissions` | `permission.assign` | Grant permission | `IMPLEMENTED` |
| 38 | `permission-management` | `permission.revoke` | **DELETE** | `/api/v1/users/{userId}/permissions/{permissionId}` | `permission.revoke` | Revoke permission | `IMPLEMENTED` |
| 39 | `user-management` | `user.update` | **PATCH** | `/api/v1/users/{userId}` | `user.update` | Update a user profile (admin) | `IMPLEMENTED` |
| 40 | `permission-management` | `permission.revoke_by_key` | **DELETE** | `/api/v1/users/{userId}/permissions/by-key/{permissionKey}` | `permission.revoke` | Revoke permission by key | `IMPLEMENTED` |
| 41 | `authentication` | `auth.changePassword` | **POST** | `/api/v1/auth/change-password` | `AUTHENTICATED` | Change password | `IMPLEMENTED` |
| 42 | `permission-management` | `user.permissions` | **GET** | `/api/v1/users/me/permissions` | `AUTHENTICATED` | List current permissions | `IMPLEMENTED` |
| 43 | `permission-management` | `permission.userList` | **GET** | `/api/v1/users/{userId}/permissions` | `permission.view` | List user permission grants | `IMPLEMENTED` |
| 44 | `department-member` | `departmentMember.move` | **PATCH** | `/api/v1/departments/{departmentId}/members/{membershipId}` | `department.member.remove & department.member.add` | Move department member | `IMPLEMENTED` |
| 45 | `role-management` | `role.list` | **GET** | `/api/v1/roles` | `role.view` | List roles | `IMPLEMENTED` |
| 46 | `role-management` | `role.create` | **POST** | `/api/v1/roles` | `role.manage` | Create custom role | `IMPLEMENTED` |
| 47 | `role-management` | `role.get` | **GET** | `/api/v1/roles/{roleId}` | `role.view` | Get role | `IMPLEMENTED` |
| 48 | `role-management` | `role.update` | **PATCH** | `/api/v1/roles/{roleId}` | `role.manage` | Update custom role | `IMPLEMENTED` |
| 49 | `role-management` | `role.ownAssignments` | **GET** | `/api/v1/users/me/roles` | `AUTHENTICATED` | List own role assignments | `IMPLEMENTED` |
| 50 | `role-management` | `role.userAssignments` | **GET** | `/api/v1/users/{userId}/roles` | `permission.view` | List user role assignments | `IMPLEMENTED` |
| 51 | `role-management` | `role.assign` | **POST** | `/api/v1/users/{userId}/roles` | `permission.assign` | Assign role | `IMPLEMENTED` |
| 52 | `role-management` | `role.revoke` | **DELETE** | `/api/v1/users/{userId}/roles/{assignmentId}` | `permission.revoke` | Revoke role assignment | `IMPLEMENTED` |
| 53 | `permission-management` | `permission.ownEffective` | **GET** | `/api/v1/users/me/effective-permissions` | `AUTHENTICATED` | List own effective permissions | `IMPLEMENTED` |
| 54 | `permission-management` | `permission.userEffective` | **GET** | `/api/v1/users/{userId}/effective-permissions` | `permission.view` | List user effective permissions | `IMPLEMENTED` |
| 55 | `permission-management` | `permission.groups` | **GET** | `/api/v1/permissions/groups` | `permission.view` | List permissions grouped by module | `IMPLEMENTED` |
| 56 | `permission-management` | `permission.replace` | **PUT** | `/api/v1/users/{userId}/permissions` | `permission.assign` | Replace user permissions at one scope | `IMPLEMENTED` |
| 57 | `setting` | `systemSettings.get` | **GET** | `/api/v1/system-settings` | `setting.view` | Read system-wide limits | `IMPLEMENTED` |
| 58 | `setting` | `systemSettings.update` | **PUT** | `/api/v1/system-settings` | `setting.update` | Change system-wide limits | `IMPLEMENTED` |
| 59 | `audit` | `audit.list` | **GET** | `/api/v1/audit-logs` | `audit.view` | Search the audit log | `IMPLEMENTED` |
| 60 | `club-application` | `clubApplication.create` | **POST** | `/api/v1/clubs/{clubId}/applications` | `AUTHENTICATED` | Submit a club application | `IMPLEMENTED` |
| 61 | `club-application` | `clubApplication.listMine` | **GET** | `/api/v1/users/me/applications` | `AUTHENTICATED` | List my club applications | `IMPLEMENTED` |
| 62 | `club-application` | `clubApplication.getMine` | **GET** | `/api/v1/users/me/applications/{applicationId}` | `AUTHENTICATED` | Get my club application | `IMPLEMENTED` |
| 63 | `club-application` | `clubApplication.cancel` | **PATCH** | `/api/v1/users/me/applications/{applicationId}/cancel` | `AUTHENTICATED` | Cancel a pending club application | `IMPLEMENTED` |
| 64 | `club-application` | `clubApplication.listForClub` | **GET** | `/api/v1/clubs/{clubId}/applications` | `application.view` | List club applications | `IMPLEMENTED` |
| 65 | `club-application` | `clubApplication.getForClub` | **GET** | `/api/v1/clubs/{clubId}/applications/{applicationId}` | `application.view \| application.view_detail` | Get a club application | `IMPLEMENTED` |
| 66 | `club-application` | `clubApplication.approve` | **POST** | `/api/v1/clubs/{clubId}/applications/{applicationId}/approve` | `application.approve \| application.review` | Approve a club application and create membership | `IMPLEMENTED` |
| 67 | `club-application` | `clubApplication.reject` | **POST** | `/api/v1/clubs/{clubId}/applications/{applicationId}/reject` | `application.reject \| application.review` | Reject a club application | `IMPLEMENTED` |
| 68 | `membership` | `membership.listMine` | **GET** | `/api/v1/users/me/memberships` | `AUTHENTICATED` | List my club membership history | `IMPLEMENTED` |
| 69 | `notification` | `notification.listMine` | **GET** | `/api/v1/users/me/notifications` | `AUTHENTICATED` | List my in-app notifications | `IMPLEMENTED` |
| 70 | `notification` | `notification.getMine` | **GET** | `/api/v1/users/me/notifications/{notificationId}` | `AUTHENTICATED` | Get a single notification owned by current user | `IMPLEMENTED` |
| 71 | `notification` | `notification.markRead` | **PATCH** | `/api/v1/users/me/notifications/{notificationId}/read` | `AUTHENTICATED` | Mark my notification as read | `IMPLEMENTED` |
| 72 | `document` | `document.list` | **GET** | `/api/v1/clubs/{clubId}/documents` | `document.view` | List club documents | `IMPLEMENTED` |
| 73 | `document` | `document.count` | **GET** | `/api/v1/clubs/{clubId}/documents/count` | `document.view` | Count club documents | `IMPLEMENTED` |
| 74 | `document` | `document.names` | **GET** | `/api/v1/clubs/{clubId}/documents/names` | `document.view` | List document names | `IMPLEMENTED` |
| 75 | `document` | `document.upload` | **POST** | `/api/v1/clubs/{clubId}/documents` | `document.upload` | Upload a document | `IMPLEMENTED` |
| 76 | `document` | `document.get` | **GET** | `/api/v1/documents/{documentId}` | `document.view` | Get a document | `IMPLEMENTED` |
| 77 | `document` | `document.update` | **PATCH** | `/api/v1/documents/{documentId}` | `document.update` | Rename a document | `IMPLEMENTED` |
| 78 | `document` | `document.delete` | **DELETE** | `/api/v1/documents/{documentId}` | `document.delete` | Soft-delete a document | `IMPLEMENTED` |
| 79 | `document` | `document.restore` | **POST** | `/api/v1/documents/{documentId}/restore` | `document.restore` | Restore a deleted document | `IMPLEMENTED` |
| 80 | `document` | `document.versions` | **GET** | `/api/v1/documents/{documentId}/versions` | `document.view` | List document versions | `IMPLEMENTED` |
| 81 | `document` | `document.upload_version` | **POST** | `/api/v1/documents/{documentId}/versions` | `document.upload` | Upload a new version | `IMPLEMENTED` |
| 82 | `document` | `document.download` | **GET** | `/api/v1/documents/{documentId}/download` | `document.view` | Download a document | `IMPLEMENTED` |
| 83 | `document` | `document.download_url` | **GET** | `/api/v1/documents/{documentId}/download-url` | `document.view` | Get a presigned download link | `IMPLEMENTED` |
| 84 | `notification` | `notification.markAllRead` | **PATCH** | `/api/v1/users/me/notifications/read-all` | `AUTHENTICATED` | Mark all my notifications as read | `IMPLEMENTED` |
| 85 | `notification` | `notification.broadcast` | **POST** | `/api/v1/clubs/{clubId}/notifications` | `notification.send` | Broadcast notification to club or department members | `IMPLEMENTED` |
| 86 | `event` | `event.listPublic` | **GET** | `/api/v1/public/events` | `PUBLIC` | List public club events on landing page | `IMPLEMENTED` |
| 87 | `event` | `event.create` | **POST** | `/api/v1/clubs/{clubId}/events` | `event.create` | Create a club event or schedule | `IMPLEMENTED` |
| 88 | `event` | `event.list` | **GET** | `/api/v1/clubs/{clubId}/events` | `event.view` | List club events | `IMPLEMENTED` |
| 89 | `event` | `event.get` | **GET** | `/api/v1/events/{eventId}` | `event.view` | Get an event | `IMPLEMENTED` |
| 90 | `event` | `event.update` | **PATCH** | `/api/v1/clubs/{clubId}/events/{eventId}` | `event.update` | Update an event | `IMPLEMENTED` |
| 91 | `event` | `event.register` | **POST** | `/api/v1/events/{eventId}/registrations` | `AUTHENTICATED` | Register current user for an event | `IMPLEMENTED` |
| 92 | `event` | `event.listRegistrations` | **GET** | `/api/v1/events/{eventId}/registrations` | `event.view \| event.attendance` | List event registrations | `IMPLEMENTED` |
| 93 | `event` | `event.cancelRegistration` | **PATCH** | `/api/v1/events/{eventId}/registrations/me/cancel` | `AUTHENTICATED` | Cancel my event registration | `IMPLEMENTED` |
| 94 | `event` | `event.recordAttendance` | **PUT** | `/api/v1/events/{eventId}/attendances` | `event.attendance` | Record event attendance | `IMPLEMENTED` |
| 95 | `event` | `event.listAttendances` | **GET** | `/api/v1/events/{eventId}/attendances` | `event.attendance \| event.view` | List event attendance records | `IMPLEMENTED` |
| 96 | `event` | `event.myCalendar` | **GET** | `/api/v1/users/me/calendar` | `AUTHENTICATED` | List my upcoming and scheduled club events | `IMPLEMENTED` |
| 97 | `task` | `task.create` | **POST** | `/api/v1/clubs/{clubId}/tasks` | `task.create` | Create and assign a task | `IMPLEMENTED` |
| 98 | `task` | `task.list` | **GET** | `/api/v1/clubs/{clubId}/tasks` | `task.view` | List club tasks | `IMPLEMENTED` |
| 99 | `task` | `task.listMine` | **GET** | `/api/v1/users/me/tasks` | `AUTHENTICATED` | List my assigned tasks | `IMPLEMENTED` |
| 100 | `task` | `task.updateProgress` | **PATCH** | `/api/v1/tasks/{taskId}/progress` | `AUTHENTICATED` | Update task progress by assignee | `IMPLEMENTED` |
| 101 | `task` | `task.verify` | **PATCH** | `/api/v1/tasks/{taskId}/verify` | `task.verify` | Verify a completed task (DONE -> COMPLETED) | `IMPLEMENTED` |
| 102 | `chat` | `chat.createChannel` | **POST** | `/api/v1/clubs/{clubId}/channels` | `chat.send` | Create a club or department chat channel | `IMPLEMENTED` |
| 103 | `chat` | `chat.listChannels` | **GET** | `/api/v1/clubs/{clubId}/channels` | `chat.view` | List club chat channels | `IMPLEMENTED` |
| 104 | `chat` | `chat.sendMessage` | **POST** | `/api/v1/channels/{channelId}/messages` | `chat.send` | Send a message to a chat channel | `IMPLEMENTED` |
| 105 | `chat` | `chat.listMessages` | **GET** | `/api/v1/channels/{channelId}/messages` | `chat.view` | List messages in a chat channel | `IMPLEMENTED` |
| 106 | `chat` | `chat.summarize` | **POST** | `/api/v1/channels/{channelId}/summaries` | `chat.summarize` | Summarize channel messages with AI Bot | `IMPLEMENTED` |
| 107 | `chat` | `chat.listSummaries` | **GET** | `/api/v1/channels/{channelId}/summaries` | `chat.view` | List AI summaries for a channel | `IMPLEMENTED` |
| 108 | `user-management` | `user.delete` | **DELETE** | `/api/v1/users/{userId}` | `user.delete` | Delete a user account (admin) | `IMPLEMENTED` |
| 109 | `club-application` | `clubApplicationForm.getActive` | **GET** | `/api/v1/clubs/{clubId}/application-form` | `AUTHENTICATED` | Get active application form for a club | `IMPLEMENTED` |
| 110 | `club-application` | `clubApplicationForm.list` | **GET** | `/api/v1/clubs/{clubId}/application-forms` | `application.manage_form \| application.view` | List application forms of a club | `IMPLEMENTED` |
| 111 | `club-application` | `clubApplicationForm.create` | **POST** | `/api/v1/clubs/{clubId}/application-forms` | `application.manage_form \| application.review` | Create an application form for a club | `IMPLEMENTED` |
| 112 | `club-application` | `clubApplicationForm.update` | **PUT** | `/api/v1/clubs/{clubId}/application-forms/{formId}` | `application.manage_form \| application.review` | Update a club application form | `IMPLEMENTED` |
| 113 | `club-application` | `clubApplicationForm.delete` | **DELETE** | `/api/v1/clubs/{clubId}/application-forms/{formId}` | `application.manage_form \| application.review` | Delete a club application form | `IMPLEMENTED` |
| 114 | `club-application` | `clubApplicationForm.uploadFile` | **POST** | `/api/v1/clubs/{clubId}/application-forms/{formId}/files` | `application.manage_form \| application.review` | Upload a template file to an application form | `IMPLEMENTED` |
| 115 | `club-application` | `clubApplicationForm.deleteFile` | **DELETE** | `/api/v1/clubs/{clubId}/application-forms/{formId}/files/{fileId}` | `application.manage_form \| application.review` | Delete a template file from an application form | `IMPLEMENTED` |
| 116 | `club-application` | `clubApplication.updateMine` | **PUT** | `/api/v1/users/me/applications/{applicationId}` | `AUTHENTICATED` | Update my pending club application | `IMPLEMENTED` |
| 117 | `club-application` | `clubApplication.updateForClub` | **PUT** | `/api/v1/clubs/{clubId}/applications/{applicationId}` | `application.update \| application.review` | Update club application details or notes (club reviewer) | `IMPLEMENTED` |
| 118 | `club-application` | `clubApplication.uploadFile` | **POST** | `/api/v1/applications/{applicationId}/files` | `AUTHENTICATED` | Upload an attachment to a club application | `IMPLEMENTED` |
| 119 | `club-application` | `clubApplication.deleteFile` | **DELETE** | `/api/v1/applications/{applicationId}/files/{fileId}` | `AUTHENTICATED` | Delete an attachment from a club application | `IMPLEMENTED` |
| 120 | `club-application` | `clubApplication.downloadFile` | **GET** | `/api/v1/application-files/{fileId}/download` | `AUTHENTICATED` | Download an application or form attachment | `IMPLEMENTED` |
| 121 | `role-management` | `role.getClubStructure` | **GET** | `/api/v1/clubs/{clubId}/positions` | `department.view` | Get club organizational leadership structure (PB-14.1, PB-14.2) | `IMPLEMENTED` |
| 122 | `role-management` | `role.assignClubPosition` | **PUT** | `/api/v1/clubs/{clubId}/positions` | `permission.assign` | Assign or replace club/department leadership position (PB-14.1, PB-14.2) | `IMPLEMENTED` |
| 123 | `role-management` | `role.revokeClubPosition` | **DELETE** | `/api/v1/clubs/{clubId}/positions/{assignmentId}` | `permission.revoke` | Revoke club or department leadership position | `IMPLEMENTED` |

---

## Scope Rules Frontend Must Reflect

- `GLOBAL` grants omit `clubId` and `departmentId`.
- `CLUB` grants include `clubId`; `DEPARTMENT` grants include `departmentId`.
- `permissionId` is the permission-definition ID. A grant ID is returned in `UserPermission.id` and is not accepted in the grant endpoint.
- Revoke calls should send `scope` and its target ID. If more than one active grant matches an underspecified revoke, the backend returns `400 AMBIGUOUS_PERMISSION_GRANT`.
- Status operations choose their permission from the target status: `user.active`/`user.inactive`, `club.active`/`club.inactive`, and `department.activate`/`department.inactive`.
- Department move uses the source department in the URL and `targetDepartmentId` in the body. It requires remove permission at the source and add permission at the target.
- AI Chat Summarizer (`POST /api/v1/channels/{channelId}/summaries`) connects to the configured **9router** OpenAI-compatible gateway (`AI_BASE_URL=https://router.anhchau.all1.vn/v1`, `AI_MODEL=apmarket`).
