package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class FestivalMultiClubEventApiTest extends ApiIntegrationTest {

    @Test
    void parentFestivalBoothsCoHostsAndShuttleBusWorkEndToEnd() throws Exception {
        UUID doanClub = club("DOANVJU");
        UUID nebClub = club("NEB");
        OffsetDateTime start = OffsetDateTime.now().plusDays(10);
        OffsetDateTime end = start.plusHours(7);
        OffsetDateTime deadline = start.minusDays(1);

        Map<String, Object> parentReq = new LinkedHashMap<>();
        parentReq.put("title", "Tết Việt Nhật – Oshougatsu 2027");
        parentReq.put("description", "Lễ hội giao thoa văn hóa truyền thống Việt - Nhật tại Hòa Lạc.");
        parentReq.put("location", "Sân nghi thức QGHN04, VJU Hòa Lạc");
        parentReq.put("startTime", start.toString());
        parentReq.put("endTime", end.toString());
        parentReq.put("registrationDeadline", deadline.toString());
        parentReq.put("allowCtv", true);
        parentReq.put("allowPublicAttendees", true);
        parentReq.put("allowShuttleBus", true);
        parentReq.put("venueMapUrl", "https://vju-club.all1.vn/maps/oshougatsu-2027.png");
        parentReq.put("facebookPostUrl", "https://www.facebook.com/vnu.vju/posts/2027");
        parentReq.put("recapAlbumUrl", "https://www.facebook.com/media/set/?set=a.2027");
        parentReq.put("coHostClubIds", List.of(nebClub, clubA, doanClub));

        JsonNode parentRes = call(post("/api/v1/clubs/" + doanClub + "/events"), adminToken, parentReq, 201);
        UUID parentId = UUID.fromString(parentRes.get("id").asText());
        assertThat(parentRes.get("allowShuttleBus").asBoolean()).isTrue();
        assertThat(parentRes.get("venueMapUrl").asText()).isEqualTo("https://vju-club.all1.vn/maps/oshougatsu-2027.png");
        assertThat(parentRes.get("facebookPostUrl").asText()).isEqualTo("https://www.facebook.com/vnu.vju/posts/2027");
        assertThat(parentRes.get("coHosts")).hasSize(2);

        // Club A registers booth B02
        Map<String, Object> boothAReq = new LinkedHashMap<>();
        boothAReq.put("title", "Gian hàng Vẽ Ema & Origami - VAC");
        boothAReq.put("location", "Khu Văn hóa - Gian B02");
        boothAReq.put("startTime", start.plusMinutes(30).toString());
        boothAReq.put("endTime", end.minusMinutes(30).toString());
        boothAReq.put("registrationDeadline", deadline.toString());
        boothAReq.put("allowCtv", true);
        boothAReq.put("allowPublicAttendees", true);
        boothAReq.put("parentEventId", parentId.toString());
        boothAReq.put("boothCode", "B02");

        JsonNode boothARes = call(post("/api/v1/clubs/" + clubA + "/events"), adminToken, boothAReq, 201);
        UUID boothAId = UUID.fromString(boothARes.get("id").asText());
        assertThat(boothARes.get("parentEventId").asText()).isEqualTo(parentId.toString());
        assertThat(boothARes.get("parentEventTitle").asText()).isEqualTo("Tết Việt Nhật – Oshougatsu 2027");
        assertThat(boothARes.get("boothCode").asText()).isEqualTo("B02");

        // Club B attempts to book duplicate booth "b02" (case-insensitive) -> 409 BOOTH_CODE_ALREADY_TAKEN
        Map<String, Object> dupBoothReq = new LinkedHashMap<>(boothAReq);
        dupBoothReq.put("title", "Gian hàng Trùng vị trí");
        dupBoothReq.put("boothCode", " b02 ");
        problem(post("/api/v1/clubs/" + clubB + "/events"), adminToken, dupBoothReq, 409, "BOOTH_CODE_ALREADY_TAKEN");

        // Club B books A01 successfully
        dupBoothReq.put("title", "Gian hàng Thử thách Học thuật ARC");
        dupBoothReq.put("boothCode", "A01");
        call(post("/api/v1/clubs/" + clubB + "/events"), adminToken, dupBoothReq, 201);

        // Block >1 level nesting (cannot attach sub-event to boothAId)
        Map<String, Object> nestedReq = new LinkedHashMap<>(boothAReq);
        nestedReq.put("parentEventId", boothAId.toString());
        nestedReq.put("boothCode", "C01");
        problem(post("/api/v1/clubs/" + clubB + "/events"), adminToken, nestedReq, 400, "NESTED_PARENT_EVENT_NOT_ALLOWED");

        // Block non-facebook domain in facebookPostUrl
        Map<String, Object> badFbReq = new LinkedHashMap<>(parentReq);
        badFbReq.put("facebookPostUrl", "https://evil.example.com/vnu.vju");
        problem(post("/api/v1/clubs/" + doanClub + "/events"), adminToken, badFbReq, 400, "INVALID_FACEBOOK_URL");

        // Public booths endpoint returns A01 then B02 without session
        JsonNode booths = call(get("/api/v1/public/events/" + parentId + "/booths"), null, null, 200);
        assertThat(booths).hasSize(2);
        assertThat(booths.get(0).get("boothCode").asText()).isEqualTo("A01");
        assertThat(booths.get(1).get("boothCode").asText()).isEqualTo("B02");

        // Parent event detail carries childBoothCount = 2
        JsonNode parentDetail = call(get("/api/v1/events/" + parentId), memberToken, null, 200);
        assertThat(parentDetail.get("childBoothCount").asInt()).isEqualTo(2);

        // Student registers for parent festival with shuttle bus = true
        JsonNode reg = call(post("/api/v1/events/" + parentId + "/registrations"), memberToken,
                Map.of("participantType", "ATTENDEE", "needsShuttleBus", true, "note", "Đi xe từ Mỹ Đình"), 201);
        assertThat(reg.get("needsShuttleBus").asBoolean()).isTrue();

        // Student registers for booth (allowShuttleBus=false) with needsShuttleBus=true -> coerced to false
        JsonNode boothReg = call(post("/api/v1/events/" + boothAId + "/registrations"), memberToken,
                Map.of("participantType", "CTV", "needsShuttleBus", true), 201);
        assertThat(boothReg.get("needsShuttleBus").asBoolean()).isFalse();

        // Timeline includes parentEventId and boothCode for GANTT de-confliction
        JsonNode timeline = call(get("/api/v1/events/timeline"), adminToken, null, 200);
        boolean foundBoothInTimeline = false;
        for (JsonNode unit : timeline.get("units")) {
            for (JsonNode ev : unit.get("events")) {
                if (boothAId.toString().equals(ev.get("id").asText())) {
                    assertThat(ev.get("parentEventId").asText()).isEqualTo(parentId.toString());
                    assertThat(ev.get("boothCode").asText()).isEqualTo("B02");
                    foundBoothInTimeline = true;
                }
            }
        }
        assertThat(foundBoothInTimeline).isTrue();
    }
}
