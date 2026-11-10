package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

class UserAvatarApiTest extends ApiIntegrationTest {
    static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13};

    static MockMultipartHttpServletRequestBuilder upload(String path, String name, byte[] bytes) {
        MockMultipartHttpServletRequestBuilder request = multipart(path);
        request.file(new MockMultipartFile("file", name, "application/octet-stream", bytes));
        return request;
    }

    static String publicPath(JsonNode user) {
        String url = user.path("avatarUrl").asText();
        return url.substring(url.indexOf("/api/v1/public/avatars/"));
    }

    @Test
    void userUploadsOwnAvatarAndItIsServedPublicly() throws Exception {
        JsonNode me = call(upload("/api/v1/users/me/avatar", "me.png", PNG), memberToken, null, 200);
        assertThat(me.path("avatarUrl").asText()).contains("/api/v1/public/avatars/" + member + "-").endsWith(".png");

        MockHttpServletResponse image = send(get(publicPath(me)), null, null);
        assertThat(image.getStatus()).isEqualTo(200);
        assertThat(image.getContentType()).isEqualTo("image/png");
        assertThat(image.getContentAsByteArray()).isEqualTo(PNG);

        // a new upload replaces the old object
        JsonNode again = call(upload("/api/v1/users/me/avatar", "me2.png", PNG), memberToken, null, 200);
        assertThat(publicPath(again)).isNotEqualTo(publicPath(me));
        assertThat(send(get(publicPath(me)), null, null).getStatus()).isEqualTo(404);
    }

    @Test
    void adminUploadsAvatarForAnotherUserButMemberCannot() throws Exception {
        JsonNode updated = call(upload("/api/v1/users/" + member + "/avatar", "a.png", PNG), adminToken, null, 200);
        assertThat(updated.path("avatarUrl").asText()).contains("/api/v1/public/avatars/" + member + "-");

        call(upload("/api/v1/users/" + admin + "/avatar", "x.png", PNG), memberToken, null, 403);
    }

    @Test
    void rejectsNonImagesAndBadFileNames() throws Exception {
        problem(upload("/api/v1/users/me/avatar", "evil.png", "<script>1</script>".getBytes()), memberToken, null, 415,
                "UNSUPPORTED_IMAGE_TYPE");
        assertThat(send(get("/api/v1/public/avatars/..%2F..%2Fsecret.png"), null, null).getStatus()).isIn(400, 404);
        assertThat(send(get("/api/v1/public/avatars/" + UUID.randomUUID() + "-" + "0".repeat(32) + ".png"), null, null)
                .getStatus()).isEqualTo(404);
    }
}
