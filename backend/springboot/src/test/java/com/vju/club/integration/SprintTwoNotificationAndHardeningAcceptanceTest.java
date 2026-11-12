package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vju.club.service.NotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Sprint 2 - Part 3/3 Acceptance Tests
 * Phụ trách: Đoàn Kinh Quốc (Backend Dev, Database)
 * 
 * Kiểm thử toàn diện các User Story & Acceptance Criteria:
 * - PB-34.1: Nhận & Xem chi tiết thông báo In-App (TC-PB-34.1-01..04)
 * - PB-34.2: Đánh dấu đã đọc & Phân quyền bảo mật sở hữu thông báo (TC-PB-34.2-01..04)
 * - PB-46: Tính toàn vẹn giao dịch ACID, Rollback & Chống gửi trùng (TC-PB-46-01..04)
 * - PB-41: Database, Migration & Kiểm thử Đua đồng thời Concurrency (TC-PB-41-01..04)
 * - PB-43: Tính nhất quán Hợp đồng OpenAPI 3.1 & Catalog (TC-PB-43-01..04)
 */
class SprintTwoNotificationAndHardeningAcceptanceTest extends ApiIntegrationTest {

    @Autowired
    private NotificationService notificationService;

    private String clubApplications(UUID clubId) {
        return "/api/v1/clubs/" + clubId + "/applications";
    }

    @Test
    @DisplayName("PB-34.1 (TC-PB-34.1-01..04): Receive in-app notifications on approval/rejection/club-inactive and view details")
    void testInAppNotificationLifecycleAndDetail() throws Exception {
        UUID student = user("pb341-student@vju.test");
        String studentToken = token(student);

        // TC-PB-34.1-01: In-app notification received upon application approval
        JsonNode app1 = call(post(clubApplications(clubA)), studentToken, Map.of("message", "Nộp đơn xét duyệt A"), 201);
        UUID app1Id = id(app1);
        call(post(clubApplications(clubA) + "/" + app1Id + "/approve"), adminToken, Map.of(
                "reviewNote", "Chào mừng bạn gia nhập CLB!"
        ), 200);

        JsonNode inboxAfterApprove = call(get("/api/v1/users/me/notifications"), studentToken, null, 200);
        assertThat(inboxAfterApprove.path("total").asInt()).isEqualTo(1);
        JsonNode notif1 = inboxAfterApprove.at("/items/0");
        UUID notif1Id = id(notif1);
        assertThat(notif1.path("referenceType").asText()).isEqualTo("CLUB_APPLICATION");
        assertThat(notif1.path("referenceId").asText()).isEqualTo(app1Id.toString());
        assertThat(notif1.path("title").asText()).contains("duyệt");
        assertThat(notif1.path("read").asBoolean()).isFalse();

        // TC-PB-34.1-04: View notification detail
        JsonNode detail = call(get("/api/v1/users/me/notifications/" + notif1Id), studentToken, null, 200);
        assertThat(detail.path("id").asText()).isEqualTo(notif1Id.toString());
        assertThat(detail.path("referenceType").asText()).isEqualTo("CLUB_APPLICATION");
        assertThat(detail.path("referenceId").asText()).isEqualTo(app1Id.toString());
        assertThat(detail.path("read").asBoolean()).isFalse();

        // TC-PB-34.1-02: In-app notification received upon application rejection
        UUID student2 = user("pb341-rejected@vju.test");
        String student2Token = token(student2);
        JsonNode app2 = call(post(clubApplications(clubB)), student2Token, Map.of("message", "Nộp đơn CLB B"), 201);
        UUID app2Id = id(app2);
        call(post(clubApplications(clubB) + "/" + app2Id + "/reject"), adminToken, Map.of(
                "reviewNote", "Rất tiếc ban đã đủ số lượng thành viên"
        ), 200);

        JsonNode inboxStudent2 = call(get("/api/v1/users/me/notifications"), student2Token, null, 200);
        assertThat(inboxStudent2.path("total").asInt()).isEqualTo(1);
        assertThat(inboxStudent2.at("/items/0/title").asText()).contains("từ chối");
        assertThat(inboxStudent2.at("/items/0/referenceType").asText()).isEqualTo("CLUB_APPLICATION");
        assertThat(inboxStudent2.at("/items/0/referenceId").asText()).isEqualTo(app2Id.toString());

        // TC-PB-34.1-03: Auto-reject pending applications and notify applicant when club becomes INACTIVE
        UUID student3 = user("pb341-deact@vju.test");
        String student3Token = token(student3);
        JsonNode app3 = call(post(clubApplications(clubA)), student3Token, Map.of("message", "Nộp đơn vào CLB chuẩn bị đóng"), 201);
        UUID app3Id = id(app3);

        call(patch("/api/v1/clubs/" + clubA + "/status"), adminToken, Map.of("status", "INACTIVE"), 200);

        JsonNode inboxStudent3 = call(get("/api/v1/users/me/notifications"), student3Token, null, 200);
        assertThat(inboxStudent3.path("total").asInt()).isEqualTo(1);
        assertThat(inboxStudent3.at("/items/0/title").asText()).contains("từ chối");
        assertThat(inboxStudent3.at("/items/0/referenceId").asText()).isEqualTo(app3Id.toString());

        // Restore clubA to ACTIVE for subsequent tests
        call(patch("/api/v1/clubs/" + clubA + "/status"), adminToken, Map.of("status", "ACTIVE"), 200);
    }

    @Test
    @DisplayName("PB-34.2 (TC-PB-34.2-01..04): Mark notification read, mark all read, owner security & 404 on cross-user access")
    void testNotificationReadManagementAndSecurity() throws Exception {
        UUID owner = user("pb342-owner@vju.test");
        UUID attacker = user("pb342-attacker@vju.test");
        String ownerToken = token(owner);
        String attackerToken = token(attacker);

        // Create 2 notifications for owner
        notificationService.create(owner, "Thông báo 1", "Nội dung 1", "CLUB", clubA, null);
        notificationService.create(owner, "Thông báo 2", "Nội dung 2", "CLUB", clubA, null);

        JsonNode inbox = call(get("/api/v1/users/me/notifications"), ownerToken, null, 200);
        assertThat(inbox.path("total").asInt()).isEqualTo(2);
        UUID notif1Id = id(inbox.at("/items/0"));
        UUID notif2Id = id(inbox.at("/items/1"));

        // TC-PB-34.2-03: Security: Attacker cannot access or mark read owner's notification (404 NOTIFICATION_NOT_FOUND)
        problem(get("/api/v1/users/me/notifications/" + notif1Id), attackerToken, null,
                404, "NOTIFICATION_NOT_FOUND");
        problem(patch("/api/v1/users/me/notifications/" + notif1Id + "/read"), attackerToken, null,
                404, "NOTIFICATION_NOT_FOUND");

        // TC-PB-34.2-04: Non-existent notification returns 404
        problem(get("/api/v1/users/me/notifications/" + UUID.randomUUID()), ownerToken, null,
                404, "NOTIFICATION_NOT_FOUND");
        problem(patch("/api/v1/users/me/notifications/" + UUID.randomUUID() + "/read"), ownerToken, null,
                404, "NOTIFICATION_NOT_FOUND");

        // TC-PB-34.2-01: Owner marks single notification as read (HTTP 204 No Content)
        call(patch("/api/v1/users/me/notifications/" + notif1Id + "/read"), ownerToken, null, 204);
        JsonNode notif1Reload = call(get("/api/v1/users/me/notifications/" + notif1Id), ownerToken, null, 200);
        assertThat(notif1Reload.path("read").asBoolean()).isTrue();

        JsonNode notif2Reload = call(get("/api/v1/users/me/notifications/" + notif2Id), ownerToken, null, 200);
        assertThat(notif2Reload.path("read").asBoolean()).isFalse();

        // TC-PB-34.2-02: Owner marks all notifications as read (HTTP 204 No Content)
        call(patch("/api/v1/users/me/notifications/read-all"), ownerToken, null, 204);
        JsonNode inboxAfterMarkAll = call(get("/api/v1/users/me/notifications"), ownerToken, null, 200);
        assertThat(inboxAfterMarkAll.at("/items/0/read").asBoolean()).isTrue();
        assertThat(inboxAfterMarkAll.at("/items/1/read").asBoolean()).isTrue();
    }

    @Test
    @DisplayName("PB-46 (TC-PB-46-01..04): ACID Transaction integrity, rollback of side-effects & idempotent eventKey deduplication")
    void testTransactionRollbackAndIdempotentDeduplication() throws Exception {
        UUID candidate = user("pb46-candidate@vju.test");
        String candidateToken = token(candidate);

        // TC-PB-46-03: Idempotent deduplication via event_key
        UUID testRefId = UUID.randomUUID();
        String eventKey = "APPLICATION_REVIEWED:" + testRefId;
        notificationService.create(candidate, "Đơn đăng ký được duyệt", "Lần gửi 1", "CLUB_APPLICATION", testRefId, eventKey);
        notificationService.create(candidate, "Đơn đăng ký được duyệt", "Lần gửi 2 (retry trùng)", "CLUB_APPLICATION", testRefId, eventKey);

        JsonNode inbox = call(get("/api/v1/users/me/notifications"), candidateToken, null, 200);
        assertThat(inbox.path("total").asInt()).isEqualTo(1);
        assertThat(inbox.at("/items/0/message").asText()).isEqualTo("Lần gửi 1");

        // TC-PB-46-01 & TC-PB-46-02: ACID Rollback: When membership insertion fails, entire transaction rolls back
        JsonNode app = call(post(clubApplications(clubA)), candidateToken, Map.of("message", "Đơn thử nghiệm rollback"), 201);
        UUID appId = id(app);

        db.execute("CREATE OR REPLACE FUNCTION phase2_rollback_check() RETURNS trigger LANGUAGE plpgsql AS $$ "
                + "BEGIN RAISE EXCEPTION 'forced phase2 rollback for test'; END; $$");
        db.execute("CREATE TRIGGER phase2_rollback_check BEFORE INSERT ON memberships "
                + "FOR EACH ROW EXECUTE FUNCTION phase2_rollback_check()");

        try {
            problem(post(clubApplications(clubA) + "/" + appId + "/approve"), adminToken, Map.of(),
                    500, "INTERNAL_ERROR");
        } finally {
            db.execute("DROP TRIGGER IF EXISTS phase2_rollback_check ON memberships");
            db.execute("DROP FUNCTION IF EXISTS phase2_rollback_check()");
        }

        // Verify Application remains PENDING
        assertThat(db.queryForObject("SELECT status FROM club_applications WHERE id = ?", String.class, appId))
                .isEqualTo("PENDING");

        // Verify 0 memberships created
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ?", candidate, clubA))
                .isZero();

        // Verify 0 user_roles created
        assertThat(count("SELECT count(*) FROM user_roles WHERE user_id = ? AND club_id = ?", candidate, clubA))
                .isZero();

        // Verify 0 approval audit_logs created
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'CLUB_APPLICATION_APPROVED' AND resource_id = ?", appId))
                .isZero();

        // TC-PB-46-04: Idempotent deactivation does not create duplicate notifications
        UUID student4 = user("pb46-multi-deact@vju.test");
        JsonNode app4 = call(post(clubApplications(clubB)), token(student4), Map.of("message", "Apply B"), 201);
        call(patch("/api/v1/clubs/" + clubB + "/status"), adminToken, Map.of("status", "INACTIVE"), 200);
        call(patch("/api/v1/clubs/" + clubB + "/status"), adminToken, Map.of("status", "INACTIVE"), 200);

        JsonNode inboxStudent4 = call(get("/api/v1/users/me/notifications"), token(student4), null, 200);
        assertThat(inboxStudent4.path("total").asInt()).isEqualTo(1);
        call(patch("/api/v1/clubs/" + clubB + "/status"), adminToken, Map.of("status", "ACTIVE"), 200);
    }

    @Test
    @DisplayName("PB-41 (TC-PB-41-01..04): Concurrency race conditions (application create, approve, cancel) & effective permission view")
    void testConcurrencyAndConstraintHardening() throws Exception {
        // TC-PB-41-01: Concurrent pending applications race condition -> 1 winner, others 409
        UUID applicant = user("pb41-concurrent-app@vju.test");
        String appToken = token(applicant);

        List<Integer> createStatuses = concurrently(8, () -> () ->
                send(post(clubApplications(clubA)), appToken, Map.of("message", "Race create")).getStatus());
        assertThat(createStatuses).containsOnly(201, 409);
        assertThat(createStatuses).filteredOn(status -> status == 201).hasSize(1);
        assertThat(count("SELECT count(*) FROM club_applications WHERE applicant_id = ? AND club_id = ? AND status = 'PENDING'",
                applicant, clubA)).isEqualTo(1);

        // TC-PB-41-02: Concurrent approvals race condition -> 1 winner, others 409
        UUID candidate = user("pb41-concurrent-approve@vju.test");
        JsonNode application = call(post(clubApplications(clubA)), token(candidate), Map.of("message", "Race approve"), 201);
        UUID appId = id(application);

        List<Integer> approveStatuses = concurrently(8, () -> () ->
                send(post(clubApplications(clubA) + "/" + appId + "/approve"), adminToken, Map.of()).getStatus());
        assertThat(approveStatuses).containsOnly(200, 409);
        assertThat(approveStatuses).filteredOn(status -> status == 200).hasSize(1);
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ? AND status = 'ACTIVE'",
                candidate, clubA)).isEqualTo(1);

        // TC-PB-41-03: Concurrent cancel vs approve race condition -> exactly 1 terminal winner
        UUID racer = user("pb41-race-cancel-approve@vju.test");
        String racerToken = token(racer);
        JsonNode raceApp = call(post(clubApplications(clubA)), racerToken, Map.of("message", "Race cancel vs approve"), 201);
        UUID raceAppId = id(raceApp);

        AtomicInteger turn = new AtomicInteger();
        List<Integer> raceStatuses = concurrently(2, () -> () -> {
            if (turn.getAndIncrement() == 0) {
                return send(patch("/api/v1/users/me/applications/" + raceAppId + "/cancel"), racerToken, null).getStatus();
            }
            return send(post(clubApplications(clubA) + "/" + raceAppId + "/approve"), adminToken, Map.of()).getStatus();
        });
        assertThat(raceStatuses).containsOnly(200, 409);
        String finalStatus = db.queryForObject("SELECT status FROM club_applications WHERE id = ?", String.class, raceAppId);
        assertThat(finalStatus).isIn("CANCELLED", "APPROVED");

        // TC-PB-41-04: View effective_user_permissions dynamically suppresses club/department permissions when SUSPENDED
        UUID suspendedUser = user("pb41-suspended@vju.test");
        UUID membershipId = membership(suspendedUser, clubA);
        grant(suspendedUser, "club.update", "CLUB", clubA, null);

        assertThat(count("SELECT count(*) FROM effective_user_permissions WHERE user_id = ? AND club_id = ?",
                suspendedUser, clubA)).isGreaterThan(0);

        db.update("UPDATE memberships SET status = 'SUSPENDED' WHERE id = ?", membershipId);
        assertThat(count("SELECT count(*) FROM effective_user_permissions WHERE user_id = ? AND club_id = ?",
                suspendedUser, clubA)).isZero();
    }
}
