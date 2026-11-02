package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vju.club.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class NotificationApiTest extends ApiIntegrationTest {
    @Autowired
    NotificationService notificationService;

    @Test
    void inboxAndDetailReturnOnlyCurrentOwnersNotificationsAndBlockCrossUserAccess() throws Exception {
        UUID other = user("other-inbox@test.local");
        String otherToken = token(other);

        JsonNode empty = call(get("/api/v1/users/me/notifications"), memberToken, null, 200);
        assertThat(empty.path("total").asInt()).isZero();
        assertThat(empty.path("items").size()).isZero();

        JsonNode app = call(post("/api/v1/clubs/" + clubA + "/applications"), memberToken,
                Map.of("message", "Em muốn tham gia"), 201);
        call(post("/api/v1/clubs/" + clubA + "/applications/" + id(app) + "/approve"), adminToken,
                Map.of("reviewNote", "Chào mừng em"), 200);

        JsonNode inbox = call(get("/api/v1/users/me/notifications"), memberToken, null, 200);
        assertThat(inbox.path("total").asInt()).isEqualTo(1);
        UUID notificationId = id(inbox.at("/items/0"));
        assertThat(inbox.at("/items/0/referenceId").asText()).isEqualTo(id(app).toString());
        assertThat(inbox.at("/items/0/referenceType").asText()).isEqualTo("CLUB_APPLICATION");
        assertThat(inbox.at("/items/0/read").asBoolean()).isFalse();

        // Owner reads detail
        JsonNode detail = call(get("/api/v1/users/me/notifications/" + notificationId), memberToken, null, 200);
        assertThat(detail.path("id").asText()).isEqualTo(notificationId.toString());
        assertThat(detail.path("referenceId").asText()).isEqualTo(id(app).toString());
        assertThat(detail.path("referenceType").asText()).isEqualTo("CLUB_APPLICATION");

        // Another user cannot view or mark-read this notification
        problem(get("/api/v1/users/me/notifications/" + notificationId), otherToken, null,
                404, "NOTIFICATION_NOT_FOUND");
        problem(patch("/api/v1/users/me/notifications/" + notificationId + "/read"), otherToken, null,
                404, "NOTIFICATION_NOT_FOUND");
        problem(get("/api/v1/users/me/notifications/" + UUID.randomUUID()), memberToken, null,
                404, "NOTIFICATION_NOT_FOUND");
        problem(patch("/api/v1/users/me/notifications/" + UUID.randomUUID() + "/read"), memberToken, null,
                404, "NOTIFICATION_NOT_FOUND");
        assertThat(db.queryForObject("SELECT read FROM notifications WHERE id = ?", Boolean.class, notificationId))
                .isFalse();

        // Owner marks read and reloads
        call(patch("/api/v1/users/me/notifications/" + notificationId + "/read"), memberToken, null, 204);
        JsonNode reloaded = call(get("/api/v1/users/me/notifications/" + notificationId), memberToken, null, 200);
        assertThat(reloaded.path("read").asBoolean()).isTrue();
    }

    @Test
    void duplicateDeliveryWithSameEventKeyIsIdempotentAndDoesNotDuplicateNotification() throws Exception {
        UUID appId = UUID.randomUUID();
        String eventKey = "APPLICATION_REVIEWED:" + appId;

        notificationService.create(member, "Đơn đăng ký được duyệt", "Lần 1", "CLUB_APPLICATION", appId, eventKey);
        notificationService.create(member, "Đơn đăng ký được duyệt", "Lần 2 retry", "CLUB_APPLICATION", appId, eventKey);

        JsonNode inbox = call(get("/api/v1/users/me/notifications"), memberToken, null, 200);
        assertThat(inbox.path("total").asInt()).isEqualTo(1);
        assertThat(inbox.at("/items/0/referenceType").asText()).isEqualTo("CLUB_APPLICATION");
        assertThat(inbox.at("/items/0/referenceId").asText()).isEqualTo(appId.toString());
    }

    @Test
    void deactivatingClubAutoRejectsPendingApplicationsAndNotifiesApplicantsOnce() throws Exception {
        JsonNode app = call(post("/api/v1/clubs/" + clubA + "/applications"), memberToken,
                Map.of("message", "Em muốn tham gia"), 201);

        call(patch("/api/v1/clubs/" + clubA + "/status"), adminToken, Map.of("status", "INACTIVE"), 200);
        // Re-patching INACTIVE is idempotent and does not duplicate notifications
        call(patch("/api/v1/clubs/" + clubA + "/status"), adminToken, Map.of("status", "INACTIVE"), 200);

        JsonNode inbox = call(get("/api/v1/users/me/notifications"), memberToken, null, 200);
        assertThat(inbox.path("total").asInt()).isEqualTo(1);
        assertThat(inbox.at("/items/0/title").asText()).contains("từ chối");
        assertThat(inbox.at("/items/0/referenceType").asText()).isEqualTo("CLUB_APPLICATION");
        assertThat(inbox.at("/items/0/referenceId").asText()).isEqualTo(id(app).toString());
    }
}

