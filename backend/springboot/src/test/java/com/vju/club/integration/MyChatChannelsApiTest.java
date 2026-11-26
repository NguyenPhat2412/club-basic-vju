package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class MyChatChannelsApiTest extends ApiIntegrationTest {

    @Test
    void listsAccessibleChannelsAcrossClubsWithUnreadCountsAndLatestPreviewAndRespectsDeptIsolation() throws Exception {
        call(get("/api/v1/chat/my-channels"), null, null, 401);

        UUID deptMedia = department(clubA, "Ban Truyền thông");
        UUID deptSecret = department(clubA, "Ban Hậu cần");

        JsonNode chClubA = call(post("/api/v1/clubs/" + clubA + "/channels"), adminToken,
                Map.of("name", "chung-club-a", "channelType", "CLUB_GENERAL"), 201);
        JsonNode chDeptMedia = call(post("/api/v1/clubs/" + clubA + "/channels"), adminToken,
                Map.of("name", "ban-truyen-thong", "channelType", "DEPARTMENT", "departmentId", deptMedia.toString()), 201);
        JsonNode chDeptSecret = call(post("/api/v1/clubs/" + clubA + "/channels"), adminToken,
                Map.of("name", "ban-hau-can", "channelType", "DEPARTMENT", "departmentId", deptSecret.toString()), 201);
        JsonNode chClubB = call(post("/api/v1/clubs/" + clubB + "/channels"), adminToken,
                Map.of("name", "chung-club-b", "channelType", "CLUB_GENERAL"), 201);

        UUID membershipA = membership(member, clubA);
        db.update("INSERT INTO department_members (id, department_id, membership_id, club_id, joined_at) VALUES (?, ?, ?, ?, now())",
                UUID.randomUUID(), deptMedia, membershipA, clubA);

        call(post("/api/v1/channels/" + id(chClubA) + "/messages"), adminToken,
                Map.of("content", "Thông báo họp tuần CLB A"), 201);
        call(post("/api/v1/channels/" + id(chDeptMedia) + "/messages"), adminToken,
                Map.of("content", "Chuẩn bị poster Tết Việt Nhật"), 201);
        call(post("/api/v1/channels/" + id(chClubB) + "/messages"), adminToken,
                Map.of("content", "Tin nội bộ CLB B"), 201);

        JsonNode memberList = call(get("/api/v1/chat/my-channels"), memberToken, null, 200);
        assertThat(memberList).hasSize(2);
        assertThat(memberList.findValuesAsText("id")).containsExactlyInAnyOrder(
                id(chClubA).toString(), id(chDeptMedia).toString()
        );
        assertThat(memberList.findValuesAsText("id")).doesNotContain(
                id(chDeptSecret).toString(), id(chClubB).toString()
        );

        JsonNode mediaRow = null;
        for (JsonNode row : memberList) {
            if (id(chDeptMedia).toString().equals(row.path("id").asText())) {
                mediaRow = row;
            }
        }
        assertThat(mediaRow).isNotNull();
        assertThat(mediaRow.path("clubCode").asText()).isNotBlank();
        assertThat(mediaRow.path("unreadCount").asLong()).isEqualTo(1L);
        assertThat(mediaRow.path("lastMessagePreview").asText()).isEqualTo("Chuẩn bị poster Tết Việt Nhật");

        JsonNode adminList = call(get("/api/v1/chat/my-channels"), adminToken, null, 200);
        assertThat(adminList.findValuesAsText("id")).contains(
                id(chClubA).toString(),
                id(chDeptMedia).toString(),
                id(chDeptSecret).toString(),
                id(chClubB).toString()
        );
    }
}
