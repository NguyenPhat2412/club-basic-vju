# VJU Club Management System — Swagger / OpenAPI Inventory (101 Endpoints)

The backend assigned to this system is `backend/springboot` (Spring Boot 3 / Java 21 / PostgreSQL 16).

## Live Swagger & OpenAPI URLs

| Environment | Swagger UI | OpenAPI 3.1 JSON | Static OpenAPI YAML | Runtime API Catalog |
|---|---|---|---|---|
| **Production (VPS)** | `http://160.22.123.184:8080/swagger-ui.html` | `http://160.22.123.184:8080/v3/api-docs` | `http://160.22.123.184:8080/api-docs/phase1.yaml` | `http://160.22.123.184:8080/api/v1/api-catalog` |
| **Local Development** | `http://localhost:8080/swagger-ui.html` | `http://localhost:8080/v3/api-docs` | `http://localhost:8080/api-docs/phase1.yaml` | `http://localhost:8080/api/v1/api-catalog` |

- **Source catalog:** [`docs/api/catalog.yml`](catalog.yml) (synced with `backend/springboot/src/main/resources/api/catalog.yml`)
- **Source OpenAPI contract:** [`docs/api/openapi.yaml`](openapi.yaml) (synced with `backend/springboot/src/main/resources/api/phase1-openapi.yaml`)
- **All 101 endpoints** across **17 modules** are marked `IMPLEMENTED` and verified by automated PostgreSQL integration tests.

## Authentication & Conventions

- **Authentication:** Send the `CLUB_SESSION` HttpOnly session cookie (plus `X-XSRF-TOKEN` header matching the `XSRF-TOKEN` cookie on unsafe methods `POST/PUT/PATCH/DELETE`) for all protected routes (`PUBLIC` routes do not require a session; `AUTHENTICATED` routes require an active logged-in session).
- **Pagination:** List endpoints use `offset` (default `0`) and `limit` (default `20`, max `100`) and return `{ items, total, offset, limit }`.
- **Error Format:** RFC 7807 Problem Details (`application/problem+json`) with a stable `code` property.
- **Contract verification:**
  ```bash
  python3 -m unittest discover -s docs/api/tests -v
  ```

---

## Complete Swagger API Endpoint List (101 Endpoints)

| # | Module | Operation ID | Method | Path | Permission / Auth | Summary | Status |
|---:|---|---|---|---|---|---|---|
| 1 | `system` | `system.apiCatalog` | **GET** | `/api/v1/api-catalog` | `PUBLIC` | List API catalog | `IMPLEMENTED` |
| 2 | `authentication` | `auth.login` | **POST** | `/api/v1/auth/login` | `PUBLIC` | Login | `IMPLEMENTED` |
| 3 | `authentication` | `auth.logout` | **POST** | `/api/v1/auth/logout` | `AUTHENTICATED` | Logout | `IMPLEMENTED` |
| 4 | `authentication` | `auth.csrf` | **GET** | `/api/v1/auth/csrf` | `PUBLIC` | Get CSRF cookie | `IMPLEMENTED` |
| 5 | `authentication` | `auth.me` | **GET** | `/api/v1/auth/me` | `AUTHENTICATED` | Get current account | `IMPLEMENTED` |
| 6 | `user-management` | `user.create` | **POST** | `/api/v1/users` | `user.create` | Create account (admin) | `IMPLEMENTED` |
| 7 | `user-profile` | `user.me` | **GET** | `/api/v1/users/me` | `AUTHENTICATED` | Get current profile | `IMPLEMENTED` |
| 8 | `user-profile` | `user.updateMe` | **PATCH** | `/api/v1/users/me` | `AUTHENTICATED` | Update current profile | `IMPLEMENTED` |
| 9 | `user-profile` | `user.list` | **GET** | `/api/v1/users` | `user.view` | List users | `IMPLEMENTED` |
| 10 | `user-profile` | `user.get` | **GET** | `/api/v1/users/{userId}` | `user.view` | Get user | `IMPLEMENTED` |
| 11 | `user-management` | `user.reset_password` | **PATCH** | `/api/v1/users/{userId}/password` | `user.reset_password` | Reset a user password (admin) | `IMPLEMENTED` |
| 12 | `user-profile` | `user.status` | **PATCH** | `/api/v1/users/{userId}/status` | `user.active | user.inactive` | Update user status | `IMPLEMENTED` |
| 13 | `club` | `club.listPublic` | **GET** | `/api/v1/public/clubs` | `PUBLIC` | List active clubs publicly | `IMPLEMENTED` |
| 14 | `club` | `club.getPublic` | **GET** | `/api/v1/public/clubs/{clubId}` | `PUBLIC` | Get active club publicly | `IMPLEMENTED` |
| 15 | `club` | `club.list` | **GET** | `/api/v1/clubs` | `club.view` | List clubs | `IMPLEMENTED` |
| 16 | `club` | `club.get` | **GET** | `/api/v1/clubs/{clubId}` | `club.view` | Get club | `IMPLEMENTED` |
| 17 | `club` | `club.create` | **POST** | `/api/v1/clubs` | `club.create` | Create club | `IMPLEMENTED` |
| 18 | `club` | `club.update` | **PATCH** | `/api/v1/clubs/{clubId}` | `club.update` | Update club | `IMPLEMENTED` |
| 19 | `club` | `club.status` | **PATCH** | `/api/v1/clubs/{clubId}/status` | `club.active | club.inactive` | Update club status | `IMPLEMENTED` |
| 20 | `department` | `department.list` | **GET** | `/api/v1/clubs/{clubId}/departments` | `department.view` | List departments | `IMPLEMENTED` |
| 21 | `department` | `department.get` | **GET** | `/api/v1/departments/{departmentId}` | `department.view` | Get department | `IMPLEMENTED` |
| 22 | `department` | `department.create` | **POST** | `/api/v1/clubs/{clubId}/departments` | `department.create` | Create department | `IMPLEMENTED` |
| 23 | `department` | `department.update` | **PATCH** | `/api/v1/departments/{departmentId}` | `department.update` | Update department | `IMPLEMENTED` |
| 24 | `department` | `department.status` | **PATCH** | `/api/v1/departments/{departmentId}/status` | `department.activate | department.inactive` | Update department status | `IMPLEMENTED` |
| 25 | `membership` | `membership.list` | **GET** | `/api/v1/clubs/{clubId}/memberships` | `member.view` | List club memberships | `IMPLEMENTED` |
| 26 | `membership` | `membership.get` | **GET** | `/api/v1/memberships/{membershipId}` | `member.view_detail` | Get membership | `IMPLEMENTED` |
| 27 | `membership` | `membership.add` | **POST** | `/api/v1/clubs/{clubId}/memberships` | `member.add` | Add member | `IMPLEMENTED` |
| 28 | `membership` | `membership.update` | **PATCH** | `/api/v1/memberships/{membershipId}` | `member.update` | Update membership | `IMPLEMENTED` |
| 29 | `membership` | `membership.remove` | **DELETE** | `/api/v1/memberships/{membershipId}` | `member.remove` | Remove member | `IMPLEMENTED` |
| 30 | `department-member` | `departmentMember.list` | **GET** | `/api/v1/departments/{departmentId}/members` | `department.member.view` | List department members | `IMPLEMENTED` |
| 31 | `department-member` | `departmentMember.add` | **POST** | `/api/v1/departments/{departmentId}/members` | `department.member.add` | Assign department member | `IMPLEMENTED` |
| 32 | `department-member` | `departmentMember.remove` | **DELETE** | `/api/v1/departments/{departmentId}/members/{membershipId}` | `department.member.remove` | Remove department member | `IMPLEMENTED` |
| 33 | `permission-management` | `permission.list` | **GET** | `/api/v1/permissions` | `permission.view` | List permission catalog | `IMPLEMENTED` |
| 34 | `permission-management` | `permission.grant` | **POST** | `/api/v1/users/{userId}/permissions` | `permission.assign` | Grant permission | `IMPLEMENTED` |
| 35 | `permission-management` | `permission.revoke` | **DELETE** | `/api/v1/users/{userId}/permissions/{permissionId}` | `permission.revoke` | Revoke permission | `IMPLEMENTED` |
| 36 | `user-management` | `user.update` | **PATCH** | `/api/v1/users/{userId}` | `user.update` | Update a user profile (admin) | `IMPLEMENTED` |
| 37 | `permission-management` | `permission.revoke_by_key` | **DELETE** | `/api/v1/users/{userId}/permissions/by-key/{permissionKey}` | `permission.revoke` | Revoke permission by key | `IMPLEMENTED` |
| 38 | `authentication` | `auth.changePassword` | **POST** | `/api/v1/auth/change-password` | `AUTHENTICATED` | Change password | `IMPLEMENTED` |
| 39 | `permission-management` | `user.permissions` | **GET** | `/api/v1/users/me/permissions` | `AUTHENTICATED` | List current permissions | `IMPLEMENTED` |
| 40 | `permission-management` | `permission.userList` | **GET** | `/api/v1/users/{userId}/permissions` | `permission.view` | List user permission grants | `IMPLEMENTED` |
| 41 | `department-member` | `departmentMember.move` | **PATCH** | `/api/v1/departments/{departmentId}/members/{membershipId}` | `department.member.remove & department.member.add` | Move department member | `IMPLEMENTED` |
| 42 | `role-management` | `role.list` | **GET** | `/api/v1/roles` | `role.view` | List roles | `IMPLEMENTED` |
| 43 | `role-management` | `role.create` | **POST** | `/api/v1/roles` | `role.manage` | Create custom role | `IMPLEMENTED` |
| 44 | `role-management` | `role.get` | **GET** | `/api/v1/roles/{roleId}` | `role.view` | Get role | `IMPLEMENTED` |
| 45 | `role-management` | `role.update` | **PATCH** | `/api/v1/roles/{roleId}` | `role.manage` | Update custom role | `IMPLEMENTED` |
| 46 | `role-management` | `role.ownAssignments` | **GET** | `/api/v1/users/me/roles` | `AUTHENTICATED` | List own role assignments | `IMPLEMENTED` |
| 47 | `role-management` | `role.userAssignments` | **GET** | `/api/v1/users/{userId}/roles` | `permission.view` | List user role assignments | `IMPLEMENTED` |
| 48 | `role-management` | `role.assign` | **POST** | `/api/v1/users/{userId}/roles` | `permission.assign` | Assign role | `IMPLEMENTED` |
| 49 | `role-management` | `role.revoke` | **DELETE** | `/api/v1/users/{userId}/roles/{assignmentId}` | `permission.revoke` | Revoke role assignment | `IMPLEMENTED` |
| 50 | `permission-management` | `permission.ownEffective` | **GET** | `/api/v1/users/me/effective-permissions` | `AUTHENTICATED` | List own effective permissions | `IMPLEMENTED` |
| 51 | `permission-management` | `permission.userEffective` | **GET** | `/api/v1/users/{userId}/effective-permissions` | `permission.view` | List user effective permissions | `IMPLEMENTED` |
| 52 | `permission-management` | `permission.groups` | **GET** | `/api/v1/permissions/groups` | `permission.view` | List permissions grouped by module | `IMPLEMENTED` |
| 53 | `permission-management` | `permission.replace` | **PUT** | `/api/v1/users/{userId}/permissions` | `permission.assign` | Replace user permissions at one scope | `IMPLEMENTED` |
| 54 | `audit` | `audit.list` | **GET** | `/api/v1/audit-logs` | `audit.view` | Search the audit log | `IMPLEMENTED` |
| 55 | `club-application` | `clubApplication.create` | **POST** | `/api/v1/clubs/{clubId}/applications` | `application.create (owner)` | Submit a club application | `IMPLEMENTED` |
| 56 | `club-application` | `clubApplication.listMine` | **GET** | `/api/v1/users/me/applications` | `AUTHENTICATED` | List my club applications | `IMPLEMENTED` |
| 57 | `club-application` | `clubApplication.getMine` | **GET** | `/api/v1/users/me/applications/{applicationId}` | `AUTHENTICATED` | Get my club application | `IMPLEMENTED` |
| 58 | `club-application` | `clubApplication.cancel` | **PATCH** | `/api/v1/users/me/applications/{applicationId}/cancel` | `application.cancel (owner)` | Cancel a pending club application | `IMPLEMENTED` |
| 59 | `club-application` | `clubApplication.listForClub` | **GET** | `/api/v1/clubs/{clubId}/applications` | `application.view` | List club applications | `IMPLEMENTED` |
| 60 | `club-application` | `clubApplication.getForClub` | **GET** | `/api/v1/clubs/{clubId}/applications/{applicationId}` | `application.view | application.view_detail` | Get a club application | `IMPLEMENTED` |
| 61 | `club-application` | `clubApplication.approve` | **POST** | `/api/v1/clubs/{clubId}/applications/{applicationId}/approve` | `application.approve | application.review` | Approve a club application and create membership | `IMPLEMENTED` |
| 62 | `club-application` | `clubApplication.reject` | **POST** | `/api/v1/clubs/{clubId}/applications/{applicationId}/reject` | `application.reject | application.review` | Reject a club application | `IMPLEMENTED` |
| 63 | `membership` | `membership.listMine` | **GET** | `/api/v1/users/me/memberships` | `AUTHENTICATED` | List my club membership history | `IMPLEMENTED` |
| 64 | `notification` | `notification.listMine` | **GET** | `/api/v1/users/me/notifications` | `AUTHENTICATED` | List my in-app notifications | `IMPLEMENTED` |
| 65 | `notification` | `notification.markRead` | **PATCH** | `/api/v1/users/me/notifications/{notificationId}/read` | `AUTHENTICATED` | Mark my notification as read | `IMPLEMENTED` |
| 66 | `document` | `document.list` | **GET** | `/api/v1/clubs/{clubId}/documents` | `document.view` | List club documents | `IMPLEMENTED` |
| 67 | `document` | `document.count` | **GET** | `/api/v1/clubs/{clubId}/documents/count` | `document.view` | Count club documents | `IMPLEMENTED` |
| 68 | `document` | `document.names` | **GET** | `/api/v1/clubs/{clubId}/documents/names` | `document.view` | List document names | `IMPLEMENTED` |
| 69 | `document` | `document.upload` | **POST** | `/api/v1/clubs/{clubId}/documents` | `document.upload` | Upload a document | `IMPLEMENTED` |
| 70 | `document` | `document.get` | **GET** | `/api/v1/documents/{documentId}` | `document.view` | Get a document | `IMPLEMENTED` |
| 71 | `document` | `document.update` | **PATCH** | `/api/v1/documents/{documentId}` | `document.update` | Rename a document | `IMPLEMENTED` |
| 72 | `document` | `document.delete` | **DELETE** | `/api/v1/documents/{documentId}` | `document.delete` | Soft-delete a document | `IMPLEMENTED` |
| 73 | `document` | `document.restore` | **POST** | `/api/v1/documents/{documentId}/restore` | `document.restore` | Restore a deleted document | `IMPLEMENTED` |
| 74 | `document` | `document.versions` | **GET** | `/api/v1/documents/{documentId}/versions` | `document.view` | List document versions | `IMPLEMENTED` |
| 75 | `document` | `document.upload_version` | **POST** | `/api/v1/documents/{documentId}/versions` | `document.upload` | Upload a new version | `IMPLEMENTED` |
| 76 | `document` | `document.download` | **GET** | `/api/v1/documents/{documentId}/download` | `document.view` | Download a document | `IMPLEMENTED` |
| 77 | `document` | `document.download_url` | **GET** | `/api/v1/documents/{documentId}/download-url` | `document.view` | Get a presigned download link | `IMPLEMENTED` |
| 78 | `notification` | `notification.markAllRead` | **PATCH** | `/api/v1/users/me/notifications/read-all` | `AUTHENTICATED` | Mark all my notifications as read | `IMPLEMENTED` |
| 79 | `notification` | `notification.broadcast` | **POST** | `/api/v1/clubs/{clubId}/notifications` | `notification.send` | Broadcast notification to club or department members | `IMPLEMENTED` |
| 80 | `event` | `event.listPublic` | **GET** | `/api/v1/public/events` | `PUBLIC` | List public club events on landing page | `IMPLEMENTED` |
| 81 | `event` | `event.create` | **POST** | `/api/v1/clubs/{clubId}/events` | `event.create` | Create a club event or schedule | `IMPLEMENTED` |
| 82 | `event` | `event.list` | **GET** | `/api/v1/clubs/{clubId}/events` | `event.view` | List club events | `IMPLEMENTED` |
| 83 | `event` | `event.get` | **GET** | `/api/v1/events/{eventId}` | `event.view` | Get an event | `IMPLEMENTED` |
| 84 | `event` | `event.update` | **PATCH** | `/api/v1/clubs/{clubId}/events/{eventId}` | `event.update` | Update an event | `IMPLEMENTED` |
| 85 | `event` | `event.register` | **POST** | `/api/v1/events/{eventId}/registrations` | `AUTHENTICATED` | Register current user for an event | `IMPLEMENTED` |
| 86 | `event` | `event.listRegistrations` | **GET** | `/api/v1/events/{eventId}/registrations` | `event.view | event.attendance` | List event registrations | `IMPLEMENTED` |
| 87 | `event` | `event.cancelRegistration` | **PATCH** | `/api/v1/events/{eventId}/registrations/me/cancel` | `AUTHENTICATED` | Cancel my event registration | `IMPLEMENTED` |
| 88 | `event` | `event.recordAttendance` | **PUT** | `/api/v1/events/{eventId}/attendances` | `event.attendance` | Record event attendance | `IMPLEMENTED` |
| 89 | `event` | `event.listAttendances` | **GET** | `/api/v1/events/{eventId}/attendances` | `event.attendance | event.view` | List event attendance records | `IMPLEMENTED` |
| 90 | `event` | `event.myCalendar` | **GET** | `/api/v1/users/me/calendar` | `AUTHENTICATED` | List my upcoming and scheduled club events | `IMPLEMENTED` |
| 91 | `task` | `task.create` | **POST** | `/api/v1/clubs/{clubId}/tasks` | `task.create` | Create and assign a task | `IMPLEMENTED` |
| 92 | `task` | `task.list` | **GET** | `/api/v1/clubs/{clubId}/tasks` | `task.view` | List club tasks | `IMPLEMENTED` |
| 93 | `task` | `task.listMine` | **GET** | `/api/v1/users/me/tasks` | `AUTHENTICATED` | List my assigned tasks | `IMPLEMENTED` |
| 94 | `task` | `task.updateProgress` | **PATCH** | `/api/v1/tasks/{taskId}/progress` | `AUTHENTICATED` | Update task progress by assignee | `IMPLEMENTED` |
| 95 | `task` | `task.verify` | **PATCH** | `/api/v1/tasks/{taskId}/verify` | `task.verify` | Verify a completed task (DONE -> COMPLETED) | `IMPLEMENTED` |
| 96 | `chat` | `chat.createChannel` | **POST** | `/api/v1/clubs/{clubId}/channels` | `chat.send` | Create a club or department chat channel | `IMPLEMENTED` |
| 97 | `chat` | `chat.listChannels` | **GET** | `/api/v1/clubs/{clubId}/channels` | `chat.view` | List club chat channels | `IMPLEMENTED` |
| 98 | `chat` | `chat.sendMessage` | **POST** | `/api/v1/channels/{channelId}/messages` | `chat.send` | Send a message to a chat channel | `IMPLEMENTED` |
| 99 | `chat` | `chat.listMessages` | **GET** | `/api/v1/channels/{channelId}/messages` | `chat.view` | List messages in a chat channel | `IMPLEMENTED` |
| 100 | `chat` | `chat.summarize` | **POST** | `/api/v1/channels/{channelId}/summaries` | `chat.summarize` | Summarize channel messages with AI Bot | `IMPLEMENTED` |
| 101 | `chat` | `chat.listSummaries` | **GET** | `/api/v1/channels/{channelId}/summaries` | `chat.view` | List AI summaries for a channel | `IMPLEMENTED` |

---

## Scope Rules Frontend Must Reflect

- `GLOBAL` grants omit `clubId` and `departmentId`.
- `CLUB` grants include `clubId`; `DEPARTMENT` grants include `departmentId`.
- `permissionId` is the permission-definition ID. A grant ID is returned in `UserPermission.id` and is not accepted in the grant endpoint.
- Revoke calls should send `scope` and its target ID. If more than one active grant matches an underspecified revoke, the backend returns `400 AMBIGUOUS_PERMISSION_GRANT`.
- Status operations choose their permission from the target status: `user.active`/`user.inactive`, `club.active`/`club.inactive`, and `department.activate`/`department.inactive`.
- Department move uses the source department in the URL and `targetDepartmentId` in the body. It requires remove permission at the source and add permission at the target.
- AI Chat Summarizer (`POST /api/v1/channels/{channelId}/summaries`) connects to the configured **9router** OpenAI-compatible gateway (`AI_BASE_URL=https://router.anhchau.all1.vn/v1`, `AI_MODEL=apmarket`).
