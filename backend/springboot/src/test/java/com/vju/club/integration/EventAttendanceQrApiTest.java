package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class EventAttendanceQrApiTest extends ApiIntegrationTest {

    @Test
    void organizerIssuesQrTokenAndRegisteredStudentSelfChecksInIdempotently() throws Exception {
        UUID student = user("qr-student@test.local");
        String studentToken = token(student);

        OffsetDateTime start = OffsetDateTime.now().plusMinutes(30);
        OffsetDateTime end = start.plusHours(2);
        OffsetDateTime deadline = start.minusMinutes(5);

        JsonNode event = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, Map.of(
                "title", "Workshop AI VJU",
                "eventType", "WORKSHOP",
                "location", "Hội trường 301 Mỹ Đình",
                "startTime", start.toString(),
                "endTime", end.toString(),
                "registrationDeadline", deadline.toString(),
                "allowCtv", true,
                "status", "OPEN_REGISTRATION"
        ), 201);
        UUID eventId = id(event);

        // Unprivileged student cannot mint organizer QR token
        problem(post("/api/v1/events/" + eventId + "/attendances/qr-token"),
                studentToken, null, 403, "PERMISSION_DENIED");

        // Organizer mints QR token
        JsonNode qr = call(post("/api/v1/events/" + eventId + "/attendances/qr-token"),
                adminToken, null, 201);
        String qrToken = qr.path("token").asText();
        assertThat(qrToken).startsWith("v1." + eventId + ".");

        // Unregistered student cannot self check-in yet
        problem(post("/api/v1/events/" + eventId + "/attendances/qr-check-in"),
                studentToken, Map.of("token", qrToken), 409, "PARTICIPANT_NOT_REGISTERED");

        // Student registers as CTV, then scans QR to check in -> PRESENT
        call(post("/api/v1/events/" + eventId + "/registrations"),
                studentToken, Map.of("note", "Hỗ trợ truyền thông"), 201);

        JsonNode firstScan = call(post("/api/v1/events/" + eventId + "/attendances/qr-check-in"),
                studentToken, Map.of("token", qrToken), 201);
        assertThat(firstScan.path("status").asText()).isEqualTo("PRESENT");
        assertThat(firstScan.path("userId").asText()).isEqualTo(student.toString());

        // Scanning a second time is idempotent
        JsonNode secondScan = call(post("/api/v1/events/" + eventId + "/attendances/qr-check-in"),
                studentToken, Map.of("token", qrToken), 201);
        assertThat(secondScan.path("id").asText()).isEqualTo(firstScan.path("id").asText());
        assertThat(secondScan.path("status").asText()).isEqualTo("PRESENT");

        // Tampered token rejected with 400 QR_TOKEN_INVALID
        problem(post("/api/v1/events/" + eventId + "/attendances/qr-check-in"),
                studentToken, Map.of("token", qrToken + "x"), 400, "QR_TOKEN_INVALID");

        // Organizer attendance list reflects the QR check-in
        JsonNode attendances = call(get("/api/v1/events/" + eventId + "/attendances"), adminToken, null, 200);
        assertThat(attendances.size()).isEqualTo(1);
        assertThat(attendances.at("/0/status").asText()).isEqualTo("PRESENT");
    }
}
