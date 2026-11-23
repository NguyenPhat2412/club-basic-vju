package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vju.club.service.impl.ChatMediaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

class AntiInflationLimitsApiTest extends ApiIntegrationTest {
    @Autowired
    private ChatMediaService chatMediaService;

    private void updateSettings(Map<String, Object> overrides) throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of(
                "maxPendingApplications", 3,
                "reapplyCooldownDays", 7,
                "maxActiveClubs", 5
        ));
        body.putAll(overrides);
        call(put("/api/v1/system-settings"), adminToken, body, 200);
    }

    @Test
    void enforcesPerClubResourceCapsAndChatRateLimitAndBroadcastCooldown() throws Exception {
        UUID freshClub = club("QUOTA");
        updateSettings(Map.of(
                "maxChannelsPerClub", 2,
                "maxDepartmentsPerClub", 1,
                "maxActiveEventsPerClub", 1,
                "maxOpenTasksPerClub", 1,
                "chatMessagesPerMinute", 2,
                "broadcastCooldownMinutes", 5
        ));

        // 1. Department cap per club
        call(post("/api/v1/clubs/" + freshClub + "/departments"), adminToken,
                Map.of("name", "Ban Truyền thông", "description", "PR"), 201);
        problem(post("/api/v1/clubs/" + freshClub + "/departments"), adminToken,
                Map.of("name", "Ban Kỹ thuật", "description", "Tech"), 409, "DEPARTMENT_LIMIT_REACHED");

        // 2. Chat channel cap per club
        JsonNode channel = call(post("/api/v1/clubs/" + freshClub + "/channels"), adminToken,
                Map.of("name", "Kênh chung 1", "channelType", "CLUB_GENERAL"), 201);
        call(post("/api/v1/clubs/" + freshClub + "/channels"), adminToken,
                Map.of("name", "Kênh chung 2", "channelType", "CLUB_GENERAL"), 201);
        problem(post("/api/v1/clubs/" + freshClub + "/channels"), adminToken,
                Map.of("name", "Kênh chung 3", "channelType", "CLUB_GENERAL"), 409, "CHAT_CHANNEL_LIMIT_REACHED");

        // 3. Chat message per-minute rate limit
        UUID channelId = id(channel);
        call(post("/api/v1/channels/" + channelId + "/messages"), adminToken,
                Map.of("content", "Tin 1"), 201);
        call(post("/api/v1/channels/" + channelId + "/messages"), adminToken,
                Map.of("content", "Tin 2"), 201);
        problem(post("/api/v1/channels/" + channelId + "/messages"), adminToken,
                Map.of("content", "Tin 3"), 429, "CHAT_RATE_LIMIT_EXCEEDED");

        // 4. Active event cap per club
        OffsetDateTime start = OffsetDateTime.now().plusDays(2);
        Map<String, Object> eventReq = Map.of(
                "title", "Sự kiện 1",
                "startTime", start.toString(),
                "endTime", start.plusHours(2).toString(),
                "registrationDeadline", start.minusHours(2).toString(),
                "allowCtv", false
        );
        call(post("/api/v1/clubs/" + freshClub + "/events"), adminToken, eventReq, 201);
        problem(post("/api/v1/clubs/" + freshClub + "/events"), adminToken,
                Map.of(
                        "title", "Sự kiện 2",
                        "startTime", start.plusDays(1).toString(),
                        "endTime", start.plusDays(1).plusHours(2).toString(),
                        "registrationDeadline", start.plusDays(1).minusHours(2).toString(),
                        "allowCtv", false
                ), 409, "EVENT_LIMIT_REACHED");

        // 5. Open task cap per club
        UUID memberId = member;
        membership(memberId, freshClub);
        call(post("/api/v1/clubs/" + freshClub + "/tasks"), adminToken, Map.of(
                "title", "Task 1",
                "assigneeId", memberId.toString(),
                "deadline", OffsetDateTime.now().plusDays(3).toString(),
                "priority", "MEDIUM"
        ), 201);
        problem(post("/api/v1/clubs/" + freshClub + "/tasks"), adminToken, Map.of(
                "title", "Task 2",
                "assigneeId", memberId.toString(),
                "deadline", OffsetDateTime.now().plusDays(4).toString(),
                "priority", "MEDIUM"
        ), 409, "TASK_LIMIT_REACHED");

        // 6. Broadcast cooldown per club
        call(post("/api/v1/clubs/" + freshClub + "/notifications"), adminToken,
                Map.of("title", "Thông báo 1", "message", "Nội dung 1"), 201);
        problem(post("/api/v1/clubs/" + freshClub + "/notifications"), adminToken,
                Map.of("title", "Thông báo 2", "message", "Nội dung 2"), 429, "BROADCAST_COOLDOWN_ACTIVE");
    }

    @Test
    void enforcesDocumentVersionLimitClubStorageQuotaAndOrphanChatCleanup() throws Exception {
        updateSettings(Map.of("documentMaxVersions", 2, "clubStorageQuotaMb", 50));

        // 1. Document version limit
        byte[] pdf1 = "%PDF-1.4\nversion-one-content".getBytes(StandardCharsets.UTF_8);
        byte[] pdf2 = "%PDF-1.4\nversion-two-content".getBytes(StandardCharsets.UTF_8);
        byte[] pdf3 = "%PDF-1.4\nversion-three-content".getBytes(StandardCharsets.UTF_8);

        var upload1 = MockMvcRequestBuilders.multipart("/api/v1/clubs/" + clubA + "/documents")
                .file(new MockMultipartFile("file", "plan.pdf", "application/pdf", pdf1))
                .param("visibility", "MEMBERS");
        JsonNode doc = call(upload1, adminToken, null, 201);
        UUID docId = id(doc);

        var ver2 = MockMvcRequestBuilders.multipart("/api/v1/documents/" + docId + "/versions")
                .file(new MockMultipartFile("file", "plan.pdf", "application/pdf", pdf2));
        call(ver2, adminToken, null, 201);

        var ver3 = MockMvcRequestBuilders.multipart("/api/v1/documents/" + docId + "/versions")
                .file(new MockMultipartFile("file", "plan.pdf", "application/pdf", pdf3));
        problem(ver3, adminToken, null, 409, "DOCUMENT_VERSION_LIMIT_REACHED");

        // 2. Upload chat attachment, simulate club reaching 50MB storage quota, verify next document upload is blocked
        JsonNode channel = call(post("/api/v1/clubs/" + clubA + "/channels"), adminToken,
                Map.of("name", "Kênh media", "channelType", "CLUB_GENERAL"), 201);
        UUID channelId = id(channel);
        byte[] png = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D};
        var attReq = MockMvcRequestBuilders.multipart("/api/v1/channels/" + channelId + "/attachments")
                .file(new MockMultipartFile("file", "orphan.png", "image/png", png));
        JsonNode att = call(attReq, adminToken, null, 201);
        UUID attId = id(att);

        db.update("UPDATE chat_message_attachments SET size_bytes = ? WHERE id = ?",
                50L * 1024L * 1024L, attId);
        var overQuotaUpload = MockMvcRequestBuilders.multipart("/api/v1/clubs/" + clubA + "/documents")
                .file(new MockMultipartFile("file", "second.pdf", "application/pdf", pdf3))
                .param("visibility", "MEMBERS");
        problem(overQuotaUpload, adminToken, null, 409, "CLUB_STORAGE_QUOTA_EXCEEDED");

        // 3. Orphan chat attachment scheduled cleanup removes unlinked uploads > 24h old
        assertThat(chatMediaService.purgeOrphanAttachments()).isZero();
        assertThat(count("SELECT count(*) FROM chat_message_attachments WHERE id = ?", attId)).isEqualTo(1);

        db.update("UPDATE chat_message_attachments SET created_at = created_at - interval '25 hours' WHERE id = ?", attId);
        assertThat(chatMediaService.purgeOrphanAttachments()).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM chat_message_attachments WHERE id = ?", attId)).isZero();

        // Once orphan is purged, storage quota is freed and document upload succeeds
        var afterCleanupUpload = MockMvcRequestBuilders.multipart("/api/v1/clubs/" + clubA + "/documents")
                .file(new MockMultipartFile("file", "second.pdf", "application/pdf", pdf3))
                .param("visibility", "MEMBERS");
        call(afterCleanupUpload, adminToken, null, 201);
    }
}
