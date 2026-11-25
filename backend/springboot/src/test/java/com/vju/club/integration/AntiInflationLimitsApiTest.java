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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

    @Test
    void returnsClubUsageWithAccurateStorageAndResourceCounts() throws Exception {
        UUID usageClub = club("USAGE");

        call(get("/api/v1/clubs/" + usageClub + "/usage"), null, null, 401);
        problem(get("/api/v1/clubs/" + usageClub + "/usage"), memberToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/clubs/" + UUID.randomUUID() + "/usage"), adminToken, null, 404, "CLUB_NOT_FOUND");

        grant(member, "club.view", "CLUB", usageClub, null);
        UUID docViewer = user("docviewer@test.local");
        grant(docViewer, "document.view", "CLUB", usageClub, null);
        call(get("/api/v1/clubs/" + usageClub + "/usage"), token(docViewer), null, 200);

        updateSettings(Map.of(
                "clubStorageQuotaMb", 60,
                "maxChannelsPerClub", 12,
                "maxDepartmentsPerClub", 8,
                "maxActiveEventsPerClub", 15,
                "maxOpenTasksPerClub", 40
        ));

        // 1 department
        call(post("/api/v1/clubs/" + usageClub + "/departments"), adminToken,
                Map.of("name", "Ban Nội dung", "description", "Content"), 201);

        // 2 channels
        JsonNode ch1 = call(post("/api/v1/clubs/" + usageClub + "/channels"), adminToken,
                Map.of("name", "Kênh chung 1", "channelType", "CLUB_GENERAL"), 201);
        call(post("/api/v1/clubs/" + usageClub + "/channels"), adminToken,
                Map.of("name", "Kênh chung 2", "channelType", "CLUB_GENERAL"), 201);

        // 1 active event + 1 completed event (excluded from activeEventCount)
        OffsetDateTime start = OffsetDateTime.now().plusDays(2);
        call(post("/api/v1/clubs/" + usageClub + "/events"), adminToken, Map.of(
                "title", "Sự kiện hoạt động",
                "startTime", start.toString(),
                "endTime", start.plusHours(2).toString(),
                "registrationDeadline", start.minusHours(2).toString(),
                "allowCtv", false
        ), 201);
        JsonNode completedEvent = call(post("/api/v1/clubs/" + usageClub + "/events"), adminToken, Map.of(
                "title", "Sự kiện đã xong",
                "startTime", start.plusDays(1).toString(),
                "endTime", start.plusDays(1).plusHours(2).toString(),
                "registrationDeadline", start.plusDays(1).minusHours(2).toString(),
                "allowCtv", false
        ), 201);
        db.update("UPDATE events SET status = 'COMPLETED' WHERE id = ?", id(completedEvent));

        // 1 open task + 1 completed task (excluded from openTaskCount)
        membership(member, usageClub);
        call(post("/api/v1/clubs/" + usageClub + "/tasks"), adminToken, Map.of(
                "title", "Task đang mở",
                "assigneeId", member.toString(),
                "deadline", OffsetDateTime.now().plusDays(3).toString(),
                "priority", "MEDIUM"
        ), 201);
        JsonNode completedTask = call(post("/api/v1/clubs/" + usageClub + "/tasks"), adminToken, Map.of(
                "title", "Task hoàn thành",
                "assigneeId", member.toString(),
                "deadline", OffsetDateTime.now().plusDays(4).toString(),
                "priority", "LOW"
        ), 201);
        db.update("UPDATE tasks SET status = 'COMPLETED' WHERE id = ?", id(completedTask));

        // 1 live document + 1 soft-deleted document (excluded from documentBytes)
        byte[] livePdf = "%PDF-1.4\nlive-document-bytes".getBytes(StandardCharsets.UTF_8);
        byte[] deletedPdf = "%PDF-1.4\ndeleted-document-bytes-excluded".getBytes(StandardCharsets.UTF_8);
        call(MockMvcRequestBuilders.multipart("/api/v1/clubs/" + usageClub + "/documents")
                .file(new MockMultipartFile("file", "live.pdf", "application/pdf", livePdf))
                .param("visibility", "MEMBERS"), adminToken, null, 201);
        JsonNode deletedDoc = call(MockMvcRequestBuilders.multipart("/api/v1/clubs/" + usageClub + "/documents")
                .file(new MockMultipartFile("file", "deleted.pdf", "application/pdf", deletedPdf))
                .param("visibility", "MEMBERS"), adminToken, null, 201);
        call(delete("/api/v1/documents/" + id(deletedDoc)), adminToken, null, 204);

        // 1 chat attachment
        byte[] png = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D};
        call(MockMvcRequestBuilders.multipart("/api/v1/channels/" + id(ch1) + "/attachments")
                .file(new MockMultipartFile("file", "media.png", "image/png", png)), adminToken, null, 201);

        JsonNode usage = call(get("/api/v1/clubs/" + usageClub + "/usage"), memberToken, null, 200);
        assertThat(usage.path("clubId").asText()).isEqualTo(usageClub.toString());
        assertThat(usage.path("documentBytes").asLong()).isEqualTo(livePdf.length);
        assertThat(usage.path("chatMediaBytes").asLong()).isEqualTo(png.length);
        assertThat(usage.path("storageUsedBytes").asLong()).isEqualTo(livePdf.length + png.length);
        assertThat(usage.path("storageQuotaMb").asInt()).isEqualTo(60);
        assertThat(usage.path("storageQuotaBytes").asLong()).isEqualTo(60L * 1024L * 1024L);
        assertThat(usage.path("channelCount").asLong()).isEqualTo(2L);
        assertThat(usage.path("maxChannelsPerClub").asInt()).isEqualTo(12);
        assertThat(usage.path("departmentCount").asLong()).isEqualTo(1L);
        assertThat(usage.path("maxDepartmentsPerClub").asInt()).isEqualTo(8);
        assertThat(usage.path("activeEventCount").asLong()).isEqualTo(1L);
        assertThat(usage.path("maxActiveEventsPerClub").asInt()).isEqualTo(15);
        assertThat(usage.path("openTaskCount").asLong()).isEqualTo(1L);
        assertThat(usage.path("maxOpenTasksPerClub").asInt()).isEqualTo(40);
    }
}
