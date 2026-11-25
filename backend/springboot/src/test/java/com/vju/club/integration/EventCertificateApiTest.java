package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

class EventCertificateApiTest extends ApiIntegrationTest {
    private static final byte[] SAMPLE_PNG = {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13
    };

    private static MockMultipartHttpServletRequestBuilder uploadTemplateRequest(UUID eventId, String name, byte[] bytes) {
        MockMultipartHttpServletRequestBuilder req = multipart("/api/v1/events/" + eventId + "/certificate-template");
        req.file(new MockMultipartFile("file", name, "application/octet-stream", bytes));
        return req;
    }

    private static MockMultipartHttpServletRequestBuilder uploadCoverRequest(UUID eventId, String name, byte[] bytes) {
        MockMultipartHttpServletRequestBuilder req = multipart("/api/v1/events/" + eventId + "/cover");
        req.file(new MockMultipartFile("file", name, "application/octet-stream", bytes));
        return req;
    }

    @Test
    void eventRolesDistinguishPublicAttendeesCtvMembersOrganizersAndGuardTaskAssignment() throws Exception {
        UUID clubMember1 = user("role-member1@st.vju.ac.vn");
        UUID clubMember2 = user("role-member2@st.vju.ac.vn");
        membership(clubMember1, clubA);
        membership(clubMember2, clubA);
        UUID outsiderAttendee = user("role-attendee@st.vju.ac.vn");
        UUID outsiderCtv = user("role-ctv@st.vju.ac.vn");
        UUID outsiderDefaultCtv = user("role-default-ctv@st.vju.ac.vn");

        String member1Token = token(clubMember1);
        String member2Token = token(clubMember2);
        String attendeeToken = token(outsiderAttendee);
        String ctvToken = token(outsiderCtv);
        String defaultCtvToken = token(outsiderDefaultCtv);

        OffsetDateTime start = OffsetDateTime.now().plusDays(2);
        OffsetDateTime end = start.plusHours(3);
        OffsetDateTime deadline = start.minusHours(1);

        // 1. Public-attendee-only event (allowPublicAttendees=true, allowCtv=false)
        JsonNode seminar = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Hội thảo Khởi nghiệp Mở rộng VJU",
                "eventType", "WORKSHOP",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", false,
                "allowPublicAttendees", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID seminarId = id(seminar);
        assertThat(seminar.path("allowCtv").asBoolean()).isFalse();
        assertThat(seminar.path("allowPublicAttendees").asBoolean()).isTrue();

        // Public events listing includes allowPublicAttendees-only events
        JsonNode publicEvents = call(get("/api/v1/public/events").param("limit", "50"), null, null, 200);
        assertThat(publicEvents.toString()).contains(seminarId.toString());

        // Outsider omitting participantType defaults to ATTENDEE
        JsonNode attendeeReg = call(post("/api/v1/events/" + seminarId + "/registrations"), attendeeToken, Map.of(), 201);
        assertThat(attendeeReg.path("participantType").asText()).isEqualTo("ATTENDEE");

        // Outsider requesting CTV on non-CTV event is rejected (403)
        problem(post("/api/v1/events/" + seminarId + "/registrations"), ctvToken,
                Map.of("participantType", "CTV"), 403, "PERMISSION_DENIED");
        // Outsider requesting MEMBER or ORGANIZER is rejected (403)
        problem(post("/api/v1/events/" + seminarId + "/registrations"), ctvToken,
                Map.of("participantType", "ORGANIZER"), 403, "PERMISSION_DENIED");

        // Active club member defaults to MEMBER, can explicitly request ORGANIZER, and cannot request CTV
        JsonNode memberReg = call(post("/api/v1/events/" + seminarId + "/registrations"), member1Token, Map.of(), 201);
        assertThat(memberReg.path("participantType").asText()).isEqualTo("MEMBER");

        problem(post("/api/v1/events/" + seminarId + "/registrations"), member2Token,
                Map.of("participantType", "CTV"), 400, "INVALID_PARTICIPANT_TYPE");
        JsonNode organizerReg = call(post("/api/v1/events/" + seminarId + "/registrations"), member2Token,
                Map.of("participantType", "ORGANIZER", "note", "Phụ trách điều phối"), 201);
        assertThat(organizerReg.path("participantType").asText()).isEqualTo("ORGANIZER");

        // 2. Hybrid event (allowCtv=true, allowPublicAttendees=true)
        JsonNode hybrid = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Ngày hội Văn hoá Việt Nhật Hybrid",
                "eventType", "CLUB_EVENT",
                "startTime", start.plusDays(1).toString(),
                "endTime", end.plusDays(1).toString(),
                "registrationDeadline", deadline.plusDays(1).toString(),
                "allowCtv", true,
                "allowPublicAttendees", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID hybridId = id(hybrid);

        // Omitting participantType on hybrid event defaults to ATTENDEE; explicit CTV gets CTV
        JsonNode hybridAttendeeReg = call(post("/api/v1/events/" + hybridId + "/registrations"), attendeeToken, Map.of(), 201);
        assertThat(hybridAttendeeReg.path("participantType").asText()).isEqualTo("ATTENDEE");

        JsonNode hybridCtvReg = call(post("/api/v1/events/" + hybridId + "/registrations"), ctvToken,
                Map.of("participantType", "CTV"), 201);
        assertThat(hybridCtvReg.path("participantType").asText()).isEqualTo("CTV");

        // Plain ATTENDEE cannot be assigned event logistics tasks (409), while CTV succeeds (201)
        problem(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "title", "Kê bàn ghế hội trường",
                "eventId", hybridId.toString(),
                "assigneeId", outsiderAttendee.toString(),
                "deadline", end.plusDays(1).toString()
        ), 409, "ASSIGNEE_NOT_ELIGIBLE_FOR_EVENT_TASK");

        call(post("/api/v1/clubs/" + clubA + "/tasks"), adminToken, Map.of(
                "title", "Điều phối check-in cổng A",
                "eventId", hybridId.toString(),
                "assigneeId", outsiderCtv.toString(),
                "deadline", end.plusDays(1).toString()
        ), 201);

        // 3. Backward compatibility: allowCtv=true with allowPublicAttendees omitted defaults non-member to CTV
        JsonNode legacyCtvEvent = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Sự kiện tuyển CTV truyền thống",
                "eventType", "CLUB_EVENT",
                "startTime", start.plusDays(2).toString(),
                "endTime", end.plusDays(2).toString(),
                "registrationDeadline", deadline.plusDays(2).toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        assertThat(legacyCtvEvent.path("allowPublicAttendees").asBoolean()).isFalse();
        JsonNode legacyReg = call(post("/api/v1/events/" + id(legacyCtvEvent) + "/registrations"), defaultCtvToken, Map.of(), 201);
        assertThat(legacyReg.path("participantType").asText()).isEqualTo("CTV");

        // BCN can update participantType and eventRole before attendance lock
        JsonNode updatedReg = call(patch("/api/v1/events/" + hybridId + "/registrations/" + id(hybridAttendeeReg)), adminToken,
                Map.of("participantType", "CTV", "eventRole", "Hậu cần"), 200);
        assertThat(updatedReg.path("participantType").asText()).isEqualTo("CTV");
        assertThat(updatedReg.path("eventRole").asText()).isEqualTo("Hậu cần");
    }

    @Test
    void certificateIssuanceRequiresLockIsIdempotentAndSupportsRevocationAndPublicVerify() throws Exception {
        UUID organizer = user("cert-organizer@st.vju.ac.vn");
        UUID ctv = user("cert-ctv@st.vju.ac.vn");
        UUID absentAttendee = user("cert-absent@st.vju.ac.vn");
        membership(organizer, clubA);
        db.update("UPDATE users SET full_name = ?, student_code = ? WHERE id = ?", "Nguyễn Văn An", "24010111", organizer);
        db.update("UPDATE users SET full_name = ?, student_code = ? WHERE id = ?", "Trần Thị Bình", "24010222", ctv);
        db.update("UPDATE users SET full_name = ?, student_code = ? WHERE id = ?", "Lê Văn C", "24010333", absentAttendee);

        String organizerToken = token(organizer);
        String ctvToken = token(ctv);
        String absentToken = token(absentAttendee);

        OffsetDateTime start = OffsetDateTime.now().plusMinutes(30);
        OffsetDateTime end = start.plusHours(2);
        OffsetDateTime deadline = start.minusMinutes(5);

        JsonNode event = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Hội nghị Khoa học Sinh viên VJU",
                "eventType", "WORKSHOP",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", true,
                "allowPublicAttendees", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID eventId = id(event);

        JsonNode orgReg = call(post("/api/v1/events/" + eventId + "/registrations"), organizerToken,
                Map.of("participantType", "ORGANIZER"), 201);
        call(patch("/api/v1/events/" + eventId + "/registrations/" + id(orgReg)), adminToken,
                Map.of("eventRole", "Trưởng ban Tổ chức"), 200);
        call(post("/api/v1/events/" + eventId + "/registrations"), ctvToken,
                Map.of("participantType", "CTV"), 201);
        call(post("/api/v1/events/" + eventId + "/registrations"), absentToken,
                Map.of("participantType", "ATTENDEE"), 201);

        call(put("/api/v1/events/" + eventId + "/attendances"), adminToken, Map.of(
                "items", List.of(
                        Map.of("userId", organizer.toString(), "status", "PRESENT"),
                        Map.of("userId", ctv.toString(), "status", "LATE"),
                        Map.of("userId", absentAttendee.toString(), "status", "ABSENT")
                )
        ), 200);

        // Issuing before SHA-256 attendance lock is rejected with 409 ATTENDANCE_NOT_LOCKED
        problem(post("/api/v1/events/" + eventId + "/certificates/issue"), adminToken, null, 409, "ATTENDANCE_NOT_LOCKED");

        // Unprivileged student cannot issue certificates
        problem(post("/api/v1/events/" + eventId + "/certificates/issue"), ctvToken, null, 403, "PERMISSION_DENIED");

        // Lock attendance
        call(post("/api/v1/events/" + eventId + "/attendances/lock"), adminToken, Map.of(), 200);

        // First issuance succeeds for PRESENT and LATE only (not ABSENT)
        JsonNode issued = call(post("/api/v1/events/" + eventId + "/certificates/issue"), adminToken, null, 200);
        assertThat(issued.path("eventId").asText()).isEqualTo(eventId.toString());
        assertThat(issued.path("issuedCount").asInt()).isEqualTo(2);
        assertThat(issued.path("totalCertificates").asLong()).isEqualTo(2L);
        assertThat(issued.path("items").size()).isEqualTo(2);

        // Audit log recorded CERTIFICATE_ISSUED
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'CERTIFICATE_ISSUED' AND resource_id = ?", eventId))
                .isEqualTo(1);

        // Second issuance is idempotent (0 newly issued, still 2 total)
        JsonNode reissued = call(post("/api/v1/events/" + eventId + "/certificates/issue"), adminToken, null, 200);
        assertThat(reissued.path("issuedCount").asInt()).isZero();
        assertThat(reissued.path("totalCertificates").asLong()).isEqualTo(2L);

        // Event certificates listing works for admin and is forbidden for outsider
        JsonNode eventCerts = call(get("/api/v1/events/" + eventId + "/certificates"), adminToken, null, 200);
        assertThat(eventCerts.path("total").asLong()).isEqualTo(2L);
        problem(get("/api/v1/events/" + eventId + "/certificates"), absentToken, null, 403, "PERMISSION_DENIED");

        // Recipient sees certificate in /api/v1/me/certificates; ABSENT user sees 0
        JsonNode orgMine = call(get("/api/v1/me/certificates"), organizerToken, null, 200);
        assertThat(orgMine.path("total").asLong()).isEqualTo(1L);
        JsonNode orgCert = orgMine.at("/items/0");
        UUID orgCertId = UUID.fromString(orgCert.path("id").asText());
        String certCode = orgCert.path("certificateCode").asText();
        assertThat(certCode).matches("^VJU-\\d{4}-[A-Z0-9]+-[A-Z0-9]{6}$");
        assertThat(orgCert.path("participantType").asText()).isEqualTo("ORGANIZER");
        assertThat(orgCert.path("eventRole").asText()).isEqualTo("Trưởng ban Tổ chức");
        assertThat(orgCert.path("status").asText()).isEqualTo("ISSUED");
        assertThat(orgCert.path("verificationSha256").asText()).matches("^[a-f0-9]{64}$");

        JsonNode absentMine = call(get("/api/v1/me/certificates"), absentToken, null, 200);
        assertThat(absentMine.path("total").asLong()).isZero();

        // Public verification works without authentication and exposes no private email/phone
        JsonNode verified = call(get("/api/v1/public/certificates/verify/" + certCode), null, null, 200);
        assertThat(verified.path("certificateCode").asText()).isEqualTo(certCode);
        assertThat(verified.path("status").asText()).isEqualTo("ISSUED");
        assertThat(verified.path("valid").asBoolean()).isTrue();
        assertThat(verified.path("recipientName").asText()).isEqualTo("Nguyễn Văn An");
        assertThat(verified.path("studentCode").asText()).isEqualTo("24010111");
        assertThat(verified.path("participantType").asText()).isEqualTo("ORGANIZER");
        assertThat(verified.path("eventRole").asText()).isEqualTo("Trưởng ban Tổ chức");
        assertThat(verified.has("email")).isFalse();
        assertThat(verified.has("phone")).isFalse();
        assertThat(verified.toString()).doesNotContain("cert-organizer@st.vju.ac.vn");

        // Unknown certificate code returns 404 CERTIFICATE_NOT_FOUND
        problem(get("/api/v1/public/certificates/verify/VJU-2099-NONE-000000"), null, null, 404, "CERTIFICATE_NOT_FOUND");

        // Revocation: non-officer forbidden, blank reason invalid, admin succeeds
        problem(post("/api/v1/certificates/" + orgCertId + "/revoke"), ctvToken,
                Map.of("reason", "Không có quyền"), 403, "PERMISSION_DENIED");
        problem(post("/api/v1/certificates/" + orgCertId + "/revoke"), adminToken,
                Map.of("reason", "   "), 400, "VALIDATION_ERROR");

        JsonNode revoked = call(post("/api/v1/certificates/" + orgCertId + "/revoke"), adminToken,
                Map.of("reason", "Phát hiện sai sót thông tin điểm danh"), 200);
        assertThat(revoked.path("status").asText()).isEqualTo("REVOKED");
        assertThat(revoked.path("revokedAt").asText()).isNotBlank();
        assertThat(revoked.path("revocationReason").asText()).isEqualTo("Phát hiện sai sót thông tin điểm danh");

        // Re-revoking returns 409 CERTIFICATE_ALREADY_REVOKED
        problem(post("/api/v1/certificates/" + orgCertId + "/revoke"), adminToken,
                Map.of("reason", "Thu hồi lại"), 409, "CERTIFICATE_ALREADY_REVOKED");

        // Audit log recorded CERTIFICATE_REVOKED
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'CERTIFICATE_REVOKED' AND resource_id = ?", orgCertId))
                .isEqualTo(1);

        // Public verify endpoint now reflects REVOKED & valid=false
        JsonNode verifiedRevoked = call(get("/api/v1/public/certificates/verify/" + certCode), null, null, 200);
        assertThat(verifiedRevoked.path("status").asText()).isEqualTo("REVOKED");
        assertThat(verifiedRevoked.path("valid").asBoolean()).isFalse();
        assertThat(verifiedRevoked.path("revokedAt").asText()).isNotBlank();
        assertThat(verifiedRevoked.path("revocationReason").asText()).isEqualTo("Phát hiện sai sót thông tin điểm danh");
    }

    @Test
    void certificateAcknowledgeRemindTemplateManagementAndClubStatsWorkEndToEnd() throws Exception {
        UUID student1 = user("ack-student1@st.vju.ac.vn");
        UUID student2 = user("ack-student2@st.vju.ac.vn");
        UUID student3 = user("ack-student3@st.vju.ac.vn");
        UUID clubAOfficer = user("ack-officer@st.vju.ac.vn");
        membership(student1, clubA);
        membership(student2, clubA);
        membership(student3, clubA);
        grant(clubAOfficer, "club.view", "CLUB", clubA, null);

        db.update("UPDATE users SET full_name = ?, student_code = ? WHERE id = ?", "Phạm Minh Anh", "24020001", student1);
        db.update("UPDATE users SET full_name = ?, student_code = ? WHERE id = ?", "Hoàng Gia Bảo", "24020002", student2);
        db.update("UPDATE users SET full_name = ?, student_code = ? WHERE id = ?", "Đỗ Thu Hà", "24020003", student3);

        String student1Token = token(student1);
        String student2Token = token(student2);
        String student3Token = token(student3);
        String officerToken = token(clubAOfficer);

        OffsetDateTime start = OffsetDateTime.now().plusMinutes(30);
        OffsetDateTime end = start.plusHours(2);
        OffsetDateTime deadline = start.minusMinutes(5);

        JsonNode event = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Lễ Vinh danh Sinh viên Tiêu biểu VJU",
                "eventType", "CLUB_EVENT",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", true,
                "allowPublicAttendees", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID eventId = id(event);

        call(post("/api/v1/events/" + eventId + "/registrations"), student1Token, Map.of(), 201);
        call(post("/api/v1/events/" + eventId + "/registrations"), student2Token, Map.of(), 201);
        call(post("/api/v1/events/" + eventId + "/registrations"), student3Token, Map.of(), 201);

        call(put("/api/v1/events/" + eventId + "/attendances"), adminToken, Map.of(
                "items", List.of(
                        Map.of("userId", student1.toString(), "status", "PRESENT"),
                        Map.of("userId", student2.toString(), "status", "PRESENT"),
                        Map.of("userId", student3.toString(), "status", "PRESENT")
                )
        ), 200);
        call(post("/api/v1/events/" + eventId + "/attendances/lock"), adminToken, Map.of(), 200);

        // Issue certificates for 3 students
        JsonNode issued = call(post("/api/v1/events/" + eventId + "/certificates/issue"), adminToken, null, 200);
        assertThat(issued.path("issuedCount").asInt()).isEqualTo(3);

        UUID cert1Id = UUID.fromString(call(get("/api/v1/me/certificates"), student1Token, null, 200).at("/items/0/id").asText());
        UUID cert2Id = UUID.fromString(call(get("/api/v1/me/certificates"), student2Token, null, 200).at("/items/0/id").asText());
        UUID cert3Id = UUID.fromString(call(get("/api/v1/me/certificates"), student3Token, null, 200).at("/items/0/id").asText());
        String cert1Code = call(get("/api/v1/me/certificates"), student1Token, null, 200).at("/items/0/certificateCode").asText();

        // 1. Custom certificate template upload -> serves publicly -> syncs to event & issued certs -> delete clears it
        problem(uploadTemplateRequest(eventId, "evil.png", "not-a-png".getBytes()), adminToken, null, 415, "UNSUPPORTED_IMAGE_TYPE");
        problem(uploadTemplateRequest(eventId, "phoi.png", SAMPLE_PNG), student1Token, null, 403, "PERMISSION_DENIED");

        JsonNode uploaded = call(uploadTemplateRequest(eventId, "phoi-clb.png", SAMPLE_PNG), adminToken, null, 200);
        String templateUrl = uploaded.path("certificateTemplateUrl").asText();
        assertThat(templateUrl).contains("/api/v1/public/certificates/templates/" + eventId + "-").endsWith(".png");

        String publicTemplatePath = templateUrl.substring(templateUrl.indexOf("/api/v1/public/certificates/templates/"));
        MockHttpServletResponse imgResp = send(get(publicTemplatePath), null, null);
        assertThat(imgResp.getStatus()).isEqualTo(200);
        assertThat(imgResp.getContentType()).isEqualTo("image/png");
        assertThat(imgResp.getContentAsByteArray()).isEqualTo(SAMPLE_PNG);

        // Event and issued certificates now expose templateUrl
        JsonNode eventAfterUpload = call(get("/api/v1/events/" + eventId), adminToken, null, 200);
        assertThat(eventAfterUpload.path("certificateTemplateUrl").asText()).isEqualTo(templateUrl);
        JsonNode verifyWithTemplate = call(get("/api/v1/public/certificates/verify/" + cert1Code), null, null, 200);
        assertThat(verifyWithTemplate.path("templateImageUrl").asText()).isEqualTo(templateUrl);

        // Delete template clears it on event & issued certs and removes stored file
        JsonNode deletedTemplate = call(delete("/api/v1/events/" + eventId + "/certificate-template"), adminToken, null, 200);
        assertThat(deletedTemplate.path("certificateTemplateUrl").isNull()).isTrue();
        assertThat(send(get(publicTemplatePath), null, null).getStatus()).isEqualTo(404);
        assertThat(call(get("/api/v1/events/" + eventId), adminToken, null, 200).path("certificateTemplateUrl").isNull()).isTrue();
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'CERTIFICATE_TEMPLATE_UPDATED' AND resource_id = ?", eventId))
                .isEqualTo(2);

        // 2. Recipient acknowledgement: 403 for other user, 200 for owner, idempotent, 409 for revoked
        problem(post("/api/v1/me/certificates/" + cert1Id + "/acknowledge"), student2Token, null, 403, "PERMISSION_DENIED");

        JsonNode acked = call(post("/api/v1/me/certificates/" + cert1Id + "/acknowledge"), student1Token, null, 200);
        String ackAt = acked.path("acknowledgedAt").asText();
        assertThat(ackAt).isNotBlank();
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'CERTIFICATE_ACKNOWLEDGED' AND resource_id = ?", cert1Id))
                .isEqualTo(1);

        // Idempotent second call preserves acknowledgedAt and does not double-audit
        JsonNode ackedAgain = call(post("/api/v1/me/certificates/" + cert1Id + "/acknowledge"), student1Token, null, 200);
        assertThat(ackedAgain.path("acknowledgedAt").asText()).isEqualTo(ackAt);
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'CERTIFICATE_ACKNOWLEDGED' AND resource_id = ?", cert1Id))
                .isEqualTo(1);

        // Revoke cert3 -> acknowledging revoked cert returns 409 CERTIFICATE_REVOKED
        call(post("/api/v1/certificates/" + cert3Id + "/revoke"), adminToken,
                Map.of("reason", "Cập nhật danh sách"), 200);
        problem(post("/api/v1/me/certificates/" + cert3Id + "/acknowledge"), student3Token, null, 409, "CERTIFICATE_REVOKED");

        // 3. Remind pending recipients: only student2 (ISSUED + unacknowledged) is reminded; student1 (acked) & student3 (revoked) skipped
        problem(post("/api/v1/events/" + eventId + "/certificates/remind"), student1Token, Map.of(), 403, "PERMISSION_DENIED");

        JsonNode reminded = call(post("/api/v1/events/" + eventId + "/certificates/remind"), adminToken,
                Map.of("customMessage", "Hạn xác nhận trước 17h thứ Sáu"), 200);
        assertThat(reminded.path("eventId").asText()).isEqualTo(eventId.toString());
        assertThat(reminded.path("remindedCount").asInt()).isEqualTo(1);
        assertThat(reminded.path("smtpConfigured").asBoolean()).isFalse();
        assertThat(reminded.path("emailedCount").asInt()).isZero();

        JsonNode student2Cert = call(get("/api/v1/me/certificates"), student2Token, null, 200).at("/items/0");
        assertThat(student2Cert.path("reminderCount").asInt()).isEqualTo(1);
        assertThat(student2Cert.path("remindedAt").asText()).isNotBlank();
        assertThat(count("SELECT count(*) FROM notifications WHERE user_id = ? AND title LIKE 'Nhắc xác nhận chứng nhận:%'", student2))
                .isEqualTo(1);
        assertThat(count("SELECT count(*) FROM notifications WHERE user_id = ? AND title LIKE 'Nhắc xác nhận chứng nhận:%'", student1))
                .isZero();
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'CERTIFICATE_REMINDER_SENT' AND resource_id = ?", eventId))
                .isEqualTo(1);

        // 4. Centralized management stats & filters: 3 total (2 issued: 1 acked, 1 pending; 1 revoked -> 50% rate)
        problem(get("/api/v1/certificates/management"), officerToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/certificates/management").param("clubId", clubB.toString()), officerToken, null, 403, "PERMISSION_DENIED");

        JsonNode clubMgmt = call(get("/api/v1/certificates/management").param("clubId", clubA.toString()), officerToken, null, 200);
        JsonNode summary = clubMgmt.path("summary");
        assertThat(summary.path("totalCertificates").asLong()).isEqualTo(3L);
        assertThat(summary.path("issuedCount").asLong()).isEqualTo(2L);
        assertThat(summary.path("revokedCount").asLong()).isEqualTo(1L);
        assertThat(summary.path("acknowledgedCount").asLong()).isEqualTo(1L);
        assertThat(summary.path("pendingAcknowledgeCount").asLong()).isEqualTo(1L);
        assertThat(summary.path("acknowledgementRate").asInt()).isEqualTo(50);
        assertThat(summary.path("clubBreakdown").size()).isEqualTo(1);
        assertThat(summary.at("/clubBreakdown/0/clubId").asText()).isEqualTo(clubA.toString());
        assertThat(summary.at("/clubBreakdown/0/acknowledgementRate").asInt()).isEqualTo(50);
        assertThat(clubMgmt.path("total").asLong()).isEqualTo(3L);

        // Filter by acknowledged=true, acknowledged=false, search
        JsonNode ackedOnly = call(get("/api/v1/certificates/management")
                .param("acknowledged", "true"), adminToken, null, 200);
        assertThat(ackedOnly.path("total").asLong()).isEqualTo(1L);
        assertThat(ackedOnly.at("/items/0/id").asText()).isEqualTo(cert1Id.toString());

        JsonNode pendingIssued = call(get("/api/v1/certificates/management")
                .param("status", "ISSUED")
                .param("acknowledged", "false")
                .param("search", "24020002"), adminToken, null, 200);
        assertThat(pendingIssued.path("total").asLong()).isEqualTo(1L);
        assertThat(pendingIssued.at("/items/0/id").asText()).isEqualTo(cert2Id.toString());

        // 5. Club statistics integrates certificate counts & acknowledgement rate
        JsonNode clubStats = call(get("/api/v1/clubs/" + clubA + "/statistics"), officerToken, null, 200);
        assertThat(clubStats.path("issuedCertificates").asLong()).isEqualTo(2L);
        assertThat(clubStats.path("acknowledgedCertificates").asLong()).isEqualTo(1L);
        assertThat(clubStats.path("pendingAcknowledgeCertificates").asLong()).isEqualTo(1L);
        assertThat(clubStats.path("revokedCertificates").asLong()).isEqualTo(1L);
        assertThat(clubStats.path("certificateAcknowledgementRate").asInt()).isEqualTo(50);
    }

    @Test
    void eventCoverUploadPublicServingAndDeleteWorkEndToEnd() throws Exception {
        UUID student = user("cover-student@st.vju.ac.vn");
        String studentToken = token(student);

        OffsetDateTime start = OffsetDateTime.now().plusDays(3);
        OffsetDateTime end = start.plusHours(3);
        OffsetDateTime deadline = start.minusHours(2);

        JsonNode created = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Ngày hội Văn hoá VJU 2026",
                "eventType", "CLUB_EVENT",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", true,
                "allowPublicAttendees", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID eventId = id(created);
        assertThat(created.path("coverImageUrl").isNull()).isTrue();
        assertThat(created.path("clubCode").asText()).isNotBlank();

        // Reject invalid image payload & unauthorized uploader
        problem(uploadCoverRequest(eventId, "bad.png", "not-a-png".getBytes()), adminToken, null, 415, "UNSUPPORTED_IMAGE_TYPE");
        problem(uploadCoverRequest(eventId, "poster.png", SAMPLE_PNG), studentToken, null, 403, "PERMISSION_DENIED");

        // Upload valid PNG cover
        JsonNode uploaded = call(uploadCoverRequest(eventId, "poster.png", SAMPLE_PNG), adminToken, null, 200);
        String coverUrl = uploaded.path("coverImageUrl").asText();
        assertThat(coverUrl).contains("/api/v1/public/events/covers/" + eventId + "-").endsWith(".png");

        // Unauthenticated GET streams the uploaded PNG with immutable cache headers
        String publicCoverPath = coverUrl.substring(coverUrl.indexOf("/api/v1/public/events/covers/"));
        MockHttpServletResponse imgResp = send(get(publicCoverPath), null, null);
        assertThat(imgResp.getStatus()).isEqualTo(200);
        assertThat(imgResp.getContentType()).isEqualTo("image/png");
        assertThat(imgResp.getHeader("Cache-Control")).contains("immutable");
        assertThat(imgResp.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(imgResp.getContentAsByteArray()).isEqualTo(SAMPLE_PNG);

        // PATCH updating unrelated fields preserves existing coverImageUrl
        JsonNode patched = call(patch("/api/v1/clubs/" + clubA + "/events/" + eventId), adminToken,
                Map.of("title", "Ngày hội Văn hoá VJU 2026 (Updated)"), 200);
        assertThat(patched.path("coverImageUrl").asText()).isEqualTo(coverUrl);

        // DELETE clears coverImageUrl and removes the stored file
        problem(delete("/api/v1/events/" + eventId + "/cover"), studentToken, null, 403, "PERMISSION_DENIED");
        JsonNode deleted = call(delete("/api/v1/events/" + eventId + "/cover"), adminToken, null, 200);
        assertThat(deleted.path("coverImageUrl").isNull()).isTrue();
        assertThat(send(get(publicCoverPath), null, null).getStatus()).isEqualTo(404);
        assertThat(call(get("/api/v1/events/" + eventId), adminToken, null, 200).path("coverImageUrl").isNull()).isTrue();
    }
}
