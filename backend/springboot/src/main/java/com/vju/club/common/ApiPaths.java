package com.vju.club.common;

import java.util.UUID;

/**
 * Single source of truth for all HTTP route paths across controllers, security filters, and download link builders.
 * Every controller under /api/v1 declares @RequestMapping(ApiPaths.API_V1) and references sub-paths from this class.
 */
public final class ApiPaths {
    private ApiPaths() {
    }

    public static final String API_V1 = "/api/v1";

    // Published OpenAPI & API Catalog
    public static final String OPENAPI_PHASE1_YAML = "/api-docs/phase1.yaml";
    public static final String API_CATALOG = "/api-catalog";

    // Auth
    public static final String AUTH_CSRF = "/auth/csrf";
    public static final String AUTH_LOGIN = "/auth/login";
    public static final String AUTH_REGISTER = "/auth/register";
    public static final String AUTH_LOGOUT = "/auth/logout";
    public static final String AUTH_GOOGLE = "/auth/google";
    public static final String AUTH_GOOGLE_CONFIG = "/auth/google/config";
    public static final String AUTH_FORGOT_PASSWORD = "/auth/forgot-password";
    public static final String AUTH_RESET_PASSWORD = "/auth/reset-password";
    public static final String AUTH_CHANGE_PASSWORD = "/auth/change-password";
    public static final String AUTH_ME = "/auth/me";

    public static final String FULL_AUTH_CSRF = API_V1 + AUTH_CSRF;
    public static final String FULL_AUTH_LOGIN = API_V1 + AUTH_LOGIN;
    public static final String FULL_AUTH_REGISTER = API_V1 + AUTH_REGISTER;
    public static final String FULL_AUTH_LOGOUT = API_V1 + AUTH_LOGOUT;
    public static final String FULL_AUTH_GOOGLE = API_V1 + AUTH_GOOGLE;
    public static final String FULL_AUTH_FORGOT_PASSWORD = API_V1 + AUTH_FORGOT_PASSWORD;
    public static final String FULL_AUTH_RESET_PASSWORD = API_V1 + AUTH_RESET_PASSWORD;
    public static final String FULL_AUTH_CHANGE_PASSWORD = API_V1 + AUTH_CHANGE_PASSWORD;
    public static final String FULL_AUTH_ME = API_V1 + AUTH_ME;

    // Users
    public static final String USERS = "/users";
    public static final String USERS_ME = "/users/me";
    public static final String USER_BY_ID = "/users/{userId}";
    public static final String USER_PASSWORD = "/users/{userId}/password";
    public static final String USER_STATUS = "/users/{userId}/status";
    public static final String USERS_ME_AVATAR = "/users/me/avatar";
    public static final String USER_AVATAR = "/users/{userId}/avatar";
    public static final String PUBLIC_AVATAR = "/public/avatars/{fileName}";

    public static final String FULL_USERS_ME = API_V1 + USERS_ME;

    // Clubs (Public & Authenticated)
    public static final String PUBLIC_CLUBS = "/public/clubs";
    public static final String PUBLIC_CLUB_CATEGORIES = "/public/clubs/categories";
    public static final String PUBLIC_CLUB_BY_ID = "/public/clubs/{clubId}";
    public static final String PUBLIC_CLUB_LOGO = "/public/clubs/{clubId}/logo";
    public static final String PUBLIC_CLUB_COVER = "/public/clubs/{clubId}/cover";
    public static final String CLUBS = "/clubs";
    public static final String CLUB_BY_ID = "/clubs/{clubId}";
    public static final String CLUB_STATUS = "/clubs/{clubId}/status";
    public static final String CLUB_LOGO = "/clubs/{clubId}/logo";
    public static final String CLUB_COVER = "/clubs/{clubId}/cover";

    // Departments & Department Members
    public static final String CLUB_DEPARTMENTS = "/clubs/{clubId}/departments";
    public static final String DEPARTMENT_BY_ID = "/departments/{departmentId}";
    public static final String DEPARTMENT_STATUS = "/departments/{departmentId}/status";
    public static final String DEPARTMENT_MEMBERS = "/departments/{departmentId}/members";
    public static final String DEPARTMENT_MEMBER_BY_ID = "/departments/{departmentId}/members/{membershipId}";

    // Memberships
    public static final String MEMBERSHIPS_BY_CLUB = "/clubs/{clubId}/memberships";
    public static final String MY_MEMBERSHIPS = "/users/me/memberships";
    public static final String MEMBERSHIP_BY_ID = "/memberships/{membershipId}";

    // Permissions
    public static final String PERMISSIONS = "/permissions";
    public static final String PERMISSION_GROUPS = "/permissions/groups";
    public static final String USER_PERMISSIONS = "/users/{userId}/permissions";
    public static final String MY_PERMISSIONS = "/users/me/permissions";
    public static final String MY_EFFECTIVE_PERMISSIONS = "/users/me/effective-permissions";
    public static final String USER_EFFECTIVE_PERMISSIONS = "/users/{userId}/effective-permissions";
    public static final String USER_PERMISSION_BY_ID = "/users/{userId}/permissions/{permissionId}";
    public static final String USER_PERMISSION_BY_KEY = "/users/{userId}/permissions/by-key/{permissionKey}";

    // Roles & Club Positions
    public static final String ROLES = "/roles";
    public static final String ROLE_BY_ID = "/roles/{roleId}";
    public static final String MY_ROLES = "/users/me/roles";
    public static final String USER_ROLES = "/users/{userId}/roles";
    public static final String USER_ROLE_BY_ID = "/users/{userId}/roles/{assignmentId}";
    public static final String CLUB_POSITIONS = "/clubs/{clubId}/positions";
    public static final String CLUB_POSITION_BY_ID = "/clubs/{clubId}/positions/{assignmentId}";

    // Club Application Forms & Applications
    public static final String CLUB_ACTIVE_APPLICATION_FORM = "/clubs/{clubId}/application-form";
    public static final String CLUB_APPLICATION_FORMS = "/clubs/{clubId}/application-forms";
    public static final String CLUB_APPLICATION_FORM_BY_ID = "/clubs/{clubId}/application-forms/{formId}";
    public static final String CLUB_APPLICATION_FORM_FILES = "/clubs/{clubId}/application-forms/{formId}/files";
    public static final String CLUB_APPLICATION_FORM_FILE_BY_ID = "/clubs/{clubId}/application-forms/{formId}/files/{fileId}";
    public static final String CLUB_APPLICATIONS = "/clubs/{clubId}/applications";
    public static final String CLUB_APPLICATION_BY_ID = "/clubs/{clubId}/applications/{applicationId}";
    public static final String CLUB_APPLICATION_APPROVE = "/clubs/{clubId}/applications/{applicationId}/approve";
    public static final String CLUB_APPLICATION_REJECT = "/clubs/{clubId}/applications/{applicationId}/reject";
    public static final String CLUB_APPLICATION_INTERVIEW = "/clubs/{clubId}/applications/{applicationId}/interview";
    public static final String CLUB_APPLICATION_INTERVIEW_REMIND = "/clubs/{clubId}/applications/{applicationId}/interview/remind";
    public static final String MY_APPLICATIONS = "/users/me/applications";
    public static final String APPLICATION_REVIEW_SUMMARY = "/applications/review-summary";
    public static final String MY_APPLICATION_BY_ID = "/users/me/applications/{applicationId}";
    public static final String MY_APPLICATION_CANCEL = "/users/me/applications/{applicationId}/cancel";
    public static final String APPLICATION_FILES = "/applications/{applicationId}/files";
    public static final String APPLICATION_FILE_BY_ID = "/applications/{applicationId}/files/{fileId}";
    public static final String APPLICATION_FILE_DOWNLOAD = "/application-files/{fileId}/download";

    // Notifications
    public static final String MY_NOTIFICATIONS = "/users/me/notifications";
    public static final String MY_NOTIFICATIONS_UNREAD_SUMMARY = "/users/me/notifications/unread-summary";
    public static final String MY_NOTIFICATION_BY_ID = "/users/me/notifications/{notificationId}";
    public static final String MY_NOTIFICATION_READ = "/users/me/notifications/{notificationId}/read";
    public static final String MY_NOTIFICATIONS_READ_ALL = "/users/me/notifications/read-all";
    public static final String CLUB_NOTIFICATIONS = "/clubs/{clubId}/notifications";
    public static final String EVENT_NOTIFICATIONS = "/events/{eventId}/notifications";
    public static final String TASK_NOTIFICATIONS = "/tasks/{taskId}/notifications";

    // Documents
    public static final String SYSTEM_DOCUMENTS = "/system/documents";
    public static final String CLUB_DOCUMENTS = "/clubs/{clubId}/documents";
    public static final String CLUB_DOCUMENTS_COUNT = "/clubs/{clubId}/documents/count";
    public static final String CLUB_DOCUMENTS_NAMES = "/clubs/{clubId}/documents/names";
    public static final String DOCUMENT_BY_ID = "/documents/{documentId}";
    public static final String DOCUMENT_RESTORE = "/documents/{documentId}/restore";
    public static final String DOCUMENT_VERSIONS = "/documents/{documentId}/versions";
    public static final String DOCUMENT_DOWNLOAD = "/documents/{documentId}/download";
    public static final String DOCUMENT_PREVIEW = "/documents/{documentId}/preview";
    public static final String DOCUMENT_DOWNLOAD_URL = "/documents/{documentId}/download-url";

    // Events & Calendar
    public static final String PUBLIC_EVENTS = "/public/events";
    public static final String EVENTS_DISCOVER = "/events/discover";
    public static final String PUBLIC_I18N_TRANSLATIONS = "/public/i18n/translations";
    public static final String PUBLIC_I18N_TRANSLATE_BATCH = "/public/i18n/translate-batch";
    public static final String CLUB_EVENTS = "/clubs/{clubId}/events";
    public static final String CLUB_EVENT_BY_ID = "/clubs/{clubId}/events/{eventId}";
    public static final String EVENT_BY_ID = "/events/{eventId}";
    public static final String EVENT_REGISTRATIONS = "/events/{eventId}/registrations";
    public static final String EVENT_REGISTRATION_BY_ID = "/events/{eventId}/registrations/{registrationId}";
    public static final String EVENT_REGISTRATION_CANCEL_ME = "/events/{eventId}/registrations/me/cancel";
    public static final String EVENT_REGISTRATION_MY_SUBMISSION = "/events/{eventId}/registrations/me/submission";
    public static final String EVENT_REGISTRATION_SUBMISSION_DOWNLOAD = "/events/{eventId}/registrations/{registrationId}/submission";
    public static final String MY_EVENT_REGISTRATIONS = "/users/me/event-registrations";
    public static final String EVENT_ATTENDANCES = "/events/{eventId}/attendances";
    public static final String EVENT_ATTENDANCE_QR_TOKEN = EVENT_ATTENDANCES + "/qr-token";
    public static final String EVENT_ATTENDANCE_QR_CHECK_IN = EVENT_ATTENDANCES + "/qr-check-in";
    public static final String MY_CALENDAR = "/users/me/calendar";

    // Tasks
    public static final String CLUB_TASKS = "/clubs/{clubId}/tasks";
    public static final String CLUB_TASKS_SUMMARY = "/clubs/{clubId}/tasks/summary";
    public static final String MY_TASKS = "/users/me/tasks";
    public static final String TASK_BY_ID = "/tasks/{taskId}";
    public static final String TASK_PROGRESS = "/tasks/{taskId}/progress";
    public static final String TASK_VERIFY = "/tasks/{taskId}/verify";

    // Statistics
    public static final String SYSTEM_STATISTICS = "/statistics/system";
    public static final String CLUB_STATISTICS = "/clubs/{clubId}/statistics";

    // Chat & AI Summaries
    public static final String WS_ENDPOINT = API_V1 + "/ws";
    public static final String CLUB_CHANNELS = "/clubs/{clubId}/channels";
    public static final String CLUB_CHANNEL_BY_ID = "/clubs/{clubId}/channels/{channelId}";
    public static final String CHANNEL_MESSAGES = "/channels/{channelId}/messages";
    public static final String CHANNEL_MESSAGE_BY_ID = "/channels/{channelId}/messages/{messageId}";
    public static final String CHANNEL_PINNED_MESSAGES = "/channels/{channelId}/pinned-messages";
    public static final String CHANNEL_MESSAGE_PIN = "/channels/{channelId}/messages/{messageId}/pin";
    public static final String CHANNEL_MESSAGE_REACTIONS = "/channels/{channelId}/messages/{messageId}/reactions";
    public static final String CHANNEL_ATTACHMENTS = "/channels/{channelId}/attachments";
    public static final String CHAT_ATTACHMENT_STREAM = "/chat-attachments/{attachmentId}/stream";
    public static final String CLUB_QUICK_REPLIES = "/clubs/{clubId}/quick-replies";
    public static final String CLUB_QUICK_REPLY_BY_ID = "/clubs/{clubId}/quick-replies/{replyId}";
    public static final String CHANNEL_READ = "/channels/{channelId}/read";
    public static final String CHANNEL_SUMMARIES = "/channels/{channelId}/summaries";

    // System Settings & Audit Logs
    public static final String SYSTEM_SETTINGS = "/system-settings";
    public static final String SYSTEM_SETTINGS_SMTP_TEST = "/system-settings/smtp-test";
    public static final String AUDIT_LOGS = "/audit-logs";

    // Club Facebook Fanpage Integration
    public static final String CLUB_FACEBOOK = "/clubs/{clubId}/facebook";
    public static final String CLUB_FACEBOOK_CONNECT_TOKEN = "/clubs/{clubId}/facebook/connect-token";
    public static final String CLUB_FACEBOOK_SYNC = "/clubs/{clubId}/facebook/sync";
    public static final String CLUB_FACEBOOK_OAUTH_START = "/clubs/{clubId}/facebook/oauth/start";
    public static final String CLUB_FACEBOOK_OAUTH_PAGES = "/clubs/{clubId}/facebook/oauth/pages";
    public static final String CLUB_FACEBOOK_OAUTH_SELECT = "/clubs/{clubId}/facebook/oauth/select";
    public static final String FACEBOOK_OAUTH_CALLBACK = "/integrations/facebook/oauth/callback";
    public static final String PUBLIC_CLUB_FACEBOOK_POSTS = "/public/clubs/{clubId}/facebook-posts";

    // Swagger / Springdoc UI
    public static final String SWAGGER_UI_HTML = "/swagger-ui.html";
    public static final String SWAGGER_UI_WILDCARD = "/swagger-ui/**";
    public static final String API_DOCS_V3_WILDCARD = "/v3/api-docs/**";

    public static String applicationFileDownloadPath(UUID fileId) {
        return API_V1 + "/application-files/" + fileId + "/download";
    }

    public static String documentDownloadPath(UUID documentId, int version) {
        return API_V1 + "/documents/" + documentId + "/download?version=" + version;
    }

    public static String publicAvatarPath(String fileName) {
        return API_V1 + "/public/avatars/" + fileName;
    }

    public static String publicClubLogoPath(UUID clubId) {
        return API_V1 + "/public/clubs/" + clubId + "/logo";
    }

    public static String publicClubCoverPath(UUID clubId) {
        return API_V1 + "/public/clubs/" + clubId + "/cover";
    }
}

