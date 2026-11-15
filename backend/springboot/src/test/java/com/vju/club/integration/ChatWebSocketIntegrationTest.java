package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.vju.club.service.UserSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.cache.CacheManager;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ChatWebSocketIntegrationTest {
    private static final String SCHEMA = "test_ws_" + UUID.randomUUID().toString().replace("-", "");
    private static final byte[] PDF_BYTES = "%PDF-1.7\n% Chat Vault Doc\n".getBytes(StandardCharsets.US_ASCII);

    @DynamicPropertySource
    static void databaseSchema(DynamicPropertyRegistry properties) {
        TestDatabase.register(properties);
        properties.add("spring.flyway.schemas", () -> SCHEMA);
        properties.add("spring.flyway.default-schema", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
        properties.add("spring.datasource.hikari.connection-init-sql", () -> "SET search_path TO " + SCHEMA);
    }

    @LocalServerPort int port;
    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate db;
    @Autowired PasswordEncoder passwords;
    @Autowired JdbcIndexedSessionRepository sessions;
    @Autowired CacheManager cacheManager;
    @Autowired UserSessionService userSessionService;

    private MockMvc mvc;
    private final ObjectMapper json = new ObjectMapper().registerModule(new JavaTimeModule());
    private UUID admin, sender, receiver, outsider, clubA, clubB;
    private String adminToken, senderToken, receiverToken, outsiderToken;

    @BeforeEach
    void setUp() {
        mvc = TestSessions.mockMvc(context);
        cacheManager.getCacheNames().forEach(name -> {
            var cache = cacheManager.getCache(name);
            if (cache != null) cache.clear();
        });
        db.execute("TRUNCATE users, clubs, spring_session CASCADE");
        db.update("UPDATE permissions SET active = true");
        db.update("UPDATE roles SET active = true");

        admin = createUser("ws.admin@test.local");
        for (UUID permId : db.queryForList("SELECT id FROM permissions", UUID.class)) {
            db.update("INSERT INTO user_permissions(user_id, permission_id, scope, granted_by) VALUES (?, ?, 'GLOBAL', ?)",
                    admin, permId, admin);
        }
        sender = createUser("ws.sender@test.local");
        receiver = createUser("ws.receiver@test.local");
        outsider = createUser("ws.outsider@test.local");

        clubA = createClub("WSA");
        clubB = createClub("WSB");

        addClubMemberWithChat(sender, clubA);
        addClubMemberWithChat(receiver, clubA);
        addClubMemberWithChat(outsider, clubB);

        adminToken = TestSessions.signedIn(sessions, admin);
        senderToken = TestSessions.signedIn(sessions, sender);
        receiverToken = TestSessions.signedIn(sessions, receiver);
        outsiderToken = TestSessions.signedIn(sessions, outsider);
    }

    @Test
    void unauthenticatedWebSocketHandshakeIsRejected() {
        WebSocketStompClient client = stompClient();
        try {
            WebSocketHttpHeaders headers = new WebSocketHttpHeaders();
            headers.setOrigin("http://localhost:3000");
            assertThatThrownBy(() -> client.connectAsync(wsUrl(), headers, new StompSessionHandlerAdapter() { })
                    .get(5, TimeUnit.SECONDS))
                    .isInstanceOf(ExecutionException.class);
        } finally {
            client.stop();
        }
    }

    @Test
    void stompDeliversRealtimeMessageWithReplyAndVaultAttachmentAndTracksUnreadAndCursor() throws Exception {
        JsonNode channel = call(post("/api/v1/clubs/" + clubA + "/channels"), adminToken,
                Map.of("name", "Kênh Chung", "channelType", "CLUB_GENERAL"), 201);
        UUID channelId = UUID.fromString(channel.path("id").asText());

        var uploadReq = multipart("/api/v1/clubs/" + clubA + "/documents");
        uploadReq.file(new MockMultipartFile("file", "Biên bản họp.pdf", "application/pdf", PDF_BYTES));
        JsonNode doc = call(uploadReq, adminToken, null, 201);
        UUID documentId = UUID.fromString(doc.path("id").asText());

        WebSocketStompClient client = stompClient();
        BlockingQueue<JsonNode> events = new LinkedBlockingQueue<>();
        StompSession session = null;
        try {
            session = connectWithCookie(client, receiverToken, new LinkedBlockingQueue<>());
            session.subscribe("/topic/channels." + channelId, new StompFrameHandler() {
                @Override
                public Type getPayloadType(StompHeaders headers) {
                    return byte[].class;
                }

                @Override
                public void handleFrame(StompHeaders headers, Object payload) {
                    try {
                        events.offer(json.readTree((byte[]) payload));
                    } catch (Exception ignored) { }
                }
            });
            // Brief pause so SimpleBroker registers subscription before HTTP POST
            Thread.sleep(150);

            JsonNode msg1 = call(post("/api/v1/channels/" + channelId + "/messages"), senderToken,
                    Map.of("content", "Xin chào cả nhóm!"), 201);
            UUID msg1Id = UUID.fromString(msg1.path("id").asText());

            JsonNode event1 = events.poll(3, TimeUnit.SECONDS);
            assertThat(event1).isNotNull();
            assertThat(event1.path("type").asText()).isEqualTo("MESSAGE_CREATED");
            assertThat(event1.at("/message/id").asText()).isEqualTo(msg1Id.toString());
            assertThat(event1.at("/message/content").asText()).isEqualTo("Xin chào cả nhóm!");

            JsonNode msg2 = call(post("/api/v1/channels/" + channelId + "/messages"), senderToken, Map.of(
                    "content", "Mình gửi biên bản họp nhé",
                    "replyToId", msg1Id,
                    "documentId", documentId
            ), 201);
            UUID msg2Id = UUID.fromString(msg2.path("id").asText());

            JsonNode event2 = events.poll(3, TimeUnit.SECONDS);
            assertThat(event2).isNotNull();
            assertThat(event2.at("/message/id").asText()).isEqualTo(msg2Id.toString());
            assertThat(event2.at("/message/replyToId").asText()).isEqualTo(msg1Id.toString());
            assertThat(event2.at("/message/documentId").asText()).isEqualTo(documentId.toString());
            assertThat(event2.at("/message/documentName").asText()).isEqualTo("Biên bản họp.pdf");
            assertThat(event2.at("/message/documentPreviewable").asBoolean()).isTrue();

            // Unread counter increments for receiver, stays 0 for sender
            JsonNode receiverChannels = call(get("/api/v1/clubs/" + clubA + "/channels"), receiverToken, null, 200);
            assertThat(receiverChannels.at("/0/unreadCount").asLong()).isEqualTo(2L);
            assertThat(receiverChannels.at("/0/lastMessageAt").asText()).isNotBlank();

            JsonNode senderChannels = call(get("/api/v1/clubs/" + clubA + "/channels"), senderToken, null, 200);
            assertThat(senderChannels.at("/0/unreadCount").asLong()).isZero();

            // Mark channel read resets unreadCount to 0
            call(post("/api/v1/channels/" + channelId + "/read"), receiverToken,
                    Map.of("lastReadMessageId", msg2Id), 204);
            JsonNode afterRead = call(get("/api/v1/clubs/" + clubA + "/channels"), receiverToken, null, 200);
            assertThat(afterRead.at("/0/unreadCount").asLong()).isZero();

            // Cursor pagination beforeId returns strictly older messages without drift
            JsonNode olderPage = call(get("/api/v1/channels/" + channelId + "/messages")
                    .param("beforeId", msg2Id.toString()).param("limit", "10"), receiverToken, null, 200);
            assertThat(olderPage.path("items")).hasSize(1);
            assertThat(olderPage.at("/items/0/id").asText()).isEqualTo(msg1Id.toString());
        } finally {
            if (session != null && session.isConnected()) session.disconnect();
            client.stop();
        }
    }

    @Test
    void stompDeliversRichMediaCollageVideoRangeStreamingAndQuickReplies() throws Exception {
        JsonNode channel = call(post("/api/v1/clubs/" + clubA + "/channels"), adminToken,
                Map.of("name", "Truyền thông & Media", "channelType", "CLUB_GENERAL"), 201);
        UUID channelId = UUID.fromString(channel.path("id").asText());

        byte[] pngBytes = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 10, 20, 30, 40};
        byte[] mp4Bytes = new byte[]{0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm', 0, 0, 2, 0};

        // Regular member (with chat.send, without document.upload) uploads image + video + PDF directly to channel
        var upImg = multipart("/api/v1/channels/" + channelId + "/attachments");
        upImg.file(new MockMultipartFile("file", "poster.png", "image/png", pngBytes));
        JsonNode attImg = call(upImg, senderToken, null, 201);
        UUID imgId = UUID.fromString(attImg.path("id").asText());
        assertThat(attImg.path("mediaKind").asText()).isEqualTo("IMAGE");

        var upVid = multipart("/api/v1/channels/" + channelId + "/attachments");
        upVid.file(new MockMultipartFile("file", "highlight.mp4", "video/mp4", mp4Bytes));
        JsonNode attVid = call(upVid, senderToken, null, 201);
        UUID vidId = UUID.fromString(attVid.path("id").asText());
        assertThat(attVid.path("mediaKind").asText()).isEqualTo("VIDEO");

        var upPdf = multipart("/api/v1/channels/" + channelId + "/attachments");
        upPdf.file(new MockMultipartFile("file", "agenda.pdf", "application/pdf", PDF_BYTES));
        JsonNode attPdf = call(upPdf, senderToken, null, 201);
        UUID pdfId = UUID.fromString(attPdf.path("id").asText());
        assertThat(attPdf.path("mediaKind").asText()).isEqualTo("FILE");

        WebSocketStompClient client = stompClient();
        BlockingQueue<JsonNode> events = new LinkedBlockingQueue<>();
        StompSession session = null;
        try {
            session = connectWithCookie(client, receiverToken, new LinkedBlockingQueue<>());
            session.subscribe("/topic/channels." + channelId, new StompFrameHandler() {
                @Override
                public Type getPayloadType(StompHeaders headers) {
                    return byte[].class;
                }

                @Override
                public void handleFrame(StompHeaders headers, Object payload) {
                    try {
                        events.offer(json.readTree((byte[]) payload));
                    } catch (Exception ignored) { }
                }
            });
            Thread.sleep(150);

            // Send media-only message (empty content + 3 attachments + clientTempId)
            JsonNode sent = call(post("/api/v1/channels/" + channelId + "/messages"), senderToken, Map.of(
                    "content", "",
                    "attachmentIds", java.util.List.of(imgId, vidId, pdfId),
                    "clientTempId", "temp-tta-9001"
            ), 201);
            assertThat(sent.path("clientTempId").asText()).isEqualTo("temp-tta-9001");
            assertThat(sent.path("attachments")).hasSize(3);

            JsonNode wsEvent = events.poll(3, TimeUnit.SECONDS);
            assertThat(wsEvent).isNotNull();
            assertThat(wsEvent.at("/message/clientTempId").asText()).isEqualTo("temp-tta-9001");
            assertThat(wsEvent.at("/message/attachments")).hasSize(3);
            assertThat(wsEvent.at("/message/attachments/0/mediaKind").asText()).isEqualTo("IMAGE");
            assertThat(wsEvent.at("/message/attachments/1/mediaKind").asText()).isEqualTo("VIDEO");
            assertThat(wsEvent.at("/message/attachments/2/mediaKind").asText()).isEqualTo("FILE");

            // History endpoint enriches attachments in exact sortOrder
            JsonNode history = call(get("/api/v1/channels/" + channelId + "/messages"), receiverToken, null, 200);
            assertThat(history.at("/items/0/attachments")).hasSize(3);

            // Streaming supports ETag 304 Not Modified, HTTP 206 Range slicing for video, and blocks outsiders
            var fullReq = get("/api/v1/chat-attachments/" + vidId + "/stream");
            TestSessions.attach(fullReq, receiverToken);
            var fullRes = mvc.perform(fullReq).andReturn().getResponse();
            assertThat(fullRes.getStatus()).isEqualTo(200);
            assertThat(fullRes.getHeader(HttpHeaders.ACCEPT_RANGES)).isEqualTo("bytes");
            String etag = fullRes.getHeader(HttpHeaders.ETAG);
            assertThat(etag).isNotBlank();

            var cachedReq = get("/api/v1/chat-attachments/" + vidId + "/stream").header(HttpHeaders.IF_NONE_MATCH, etag);
            TestSessions.attach(cachedReq, receiverToken);
            assertThat(mvc.perform(cachedReq).andReturn().getResponse().getStatus()).isEqualTo(304);

            var rangeReq = get("/api/v1/chat-attachments/" + vidId + "/stream").header(HttpHeaders.RANGE, "bytes=4-7");
            TestSessions.attach(rangeReq, receiverToken);
            var rangeRes = mvc.perform(rangeReq).andReturn().getResponse();
            assertThat(rangeRes.getStatus()).isEqualTo(206);
            assertThat(rangeRes.getHeader(HttpHeaders.CONTENT_RANGE)).isEqualTo("bytes 4-7/" + mp4Bytes.length);
            assertThat(rangeRes.getContentAsByteArray()).isEqualTo("ftyp".getBytes(StandardCharsets.US_ASCII));

            call(get("/api/v1/chat-attachments/" + vidId + "/stream"), outsiderToken, null, 403);

            // Quick Replies CRUD for regular club member
            JsonNode qrCreated = call(post("/api/v1/clubs/" + clubA + "/quick-replies"), senderToken, Map.of(
                    "shortcut", "Điểm danh CLB",
                    "title", "Điểm danh buổi tối",
                    "content", "Các bạn điểm danh tại đây nhé!"
            ), 201);
            String qrId = qrCreated.path("id").asText();
            assertThat(qrCreated.path("shortcut").asText()).isEqualTo("/diem-danh-clb");

            JsonNode qrUpdated = call(put("/api/v1/clubs/" + clubA + "/quick-replies/" + qrId), senderToken, Map.of(
                    "shortcut", "/diem-danh-hl",
                    "title", "Điểm danh Hòa Lạc",
                    "content", "Điểm danh cơ sở Hòa Lạc & Mỹ Đình!"
            ), 200);
            assertThat(qrUpdated.path("shortcut").asText()).isEqualTo("/diem-danh-hl");

            JsonNode qrList = call(get("/api/v1/clubs/" + clubA + "/quick-replies"), receiverToken, null, 200);
            assertThat(qrList).hasSize(1);

            call(delete("/api/v1/clubs/" + clubA + "/quick-replies/" + qrId), senderToken, null, 204);
        } finally {
            if (session != null && session.isConnected()) session.disconnect();
            client.stop();
        }
    }

    @Test
    void crossClubSubscribeIsBlockedByStompChannelInterceptor() throws Exception {
        JsonNode clubAChannel = call(post("/api/v1/clubs/" + clubA + "/channels"), adminToken,
                Map.of("name", "Nội bộ CLB A", "channelType", "CLUB_GENERAL"), 201);
        UUID clubAChannelId = UUID.fromString(clubAChannel.path("id").asText());

        WebSocketStompClient client = stompClient();
        BlockingQueue<String> brokerErrors = new LinkedBlockingQueue<>();
        BlockingQueue<JsonNode> leakedMessages = new LinkedBlockingQueue<>();
        StompSession session = null;
        try {
            session = connectWithCookie(client, outsiderToken, brokerErrors);
            session.subscribe("/topic/channels." + clubAChannelId, new StompFrameHandler() {
                @Override
                public Type getPayloadType(StompHeaders headers) {
                    return byte[].class;
                }

                @Override
                public void handleFrame(StompHeaders headers, Object payload) {
                    try {
                        leakedMessages.offer(json.readTree((byte[]) payload));
                    } catch (Exception ignored) { }
                }
            });

            String error = brokerErrors.poll(3, TimeUnit.SECONDS);
            assertThat(error).isNotNull().contains("PERMISSION_DENIED");

            call(post("/api/v1/channels/" + clubAChannelId + "/messages"), senderToken,
                    Map.of("content", "Tin mật CLB A"), 201);
            assertThat(leakedMessages.poll(400, TimeUnit.MILLISECONDS)).isNull();
        } finally {
            if (session != null && session.isConnected()) session.disconnect();
            client.stop();
        }
    }

    @Test
    void officerOnlyDocumentCannotBeAttachedInGeneralChannelAndSessionTerminationClosesOpenWebSocket() throws Exception {
        JsonNode channel = call(post("/api/v1/clubs/" + clubA + "/channels"), adminToken,
                Map.of("name", "Kênh Chung", "channelType", "CLUB_GENERAL"), 201);
        UUID channelId = UUID.fromString(channel.path("id").asText());

        var uploadReq = multipart("/api/v1/clubs/" + clubA + "/documents").param("visibility", "OFFICERS");
        uploadReq.file(new MockMultipartFile("file", "Mật BCN.pdf", "application/pdf", PDF_BYTES));
        JsonNode officerDoc = call(uploadReq, adminToken, null, 201);

        JsonNode err = call(post("/api/v1/channels/" + channelId + "/messages"), adminToken, Map.of(
                "content", "Đính kèm nhầm",
                "documentId", officerDoc.path("id").asText()
        ), 400);
        assertThat(err.path("code").asText()).isEqualTo("DOCUMENT_CHANNEL_SCOPE_MISMATCH");

        WebSocketStompClient client = stompClient();
        StompSession session = null;
        try {
            session = connectWithCookie(client, receiverToken, new LinkedBlockingQueue<>());
            assertThat(session.isConnected()).isTrue();
            userSessionService.endAllSessions(receiver);
            long deadline = System.currentTimeMillis() + 3_000;
            while (session.isConnected() && System.currentTimeMillis() < deadline) {
                Thread.sleep(50);
            }
            assertThat(session.isConnected()).isFalse();
        } finally {
            if (session != null && session.isConnected()) session.disconnect();
            client.stop();
        }
    }

    private StompSession connectWithCookie(WebSocketStompClient client, String cookieVal, BlockingQueue<String> errors)
            throws Exception {
        WebSocketHttpHeaders headers = new WebSocketHttpHeaders();
        headers.setOrigin("http://localhost:3000");
        headers.add(HttpHeaders.COOKIE, TestSessions.COOKIE + "=" + cookieVal);
        return client.connectAsync(wsUrl(), headers, new StompSessionHandlerAdapter() {
            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                errors.offer(headers.getFirst("message"));
            }

            @Override
            public void handleException(StompSession s, StompCommand c, StompHeaders h, byte[] p, Throwable ex) {
                errors.offer(ex.getMessage());
            }

            @Override
            public void handleTransportError(StompSession s, Throwable ex) {
                if (ex.getMessage() != null) errors.offer(ex.getMessage());
            }
        }).get(5, TimeUnit.SECONDS);
    }

    private WebSocketStompClient stompClient() {
        return new WebSocketStompClient(new StandardWebSocketClient());
    }

    private String wsUrl() {
        return "ws://127.0.0.1:" + port + "/api/v1/ws";
    }

    private UUID createUser(String email) {
        UUID id = UUID.randomUUID();
        db.update("INSERT INTO users(id, email, password_hash, full_name, status) VALUES (?, ?, ?, ?, 'ACTIVE')",
                id, email, passwords.encode("Password123!"), email);
        return id;
    }

    private UUID createClub(String code) {
        UUID id = UUID.randomUUID();
        db.update("INSERT INTO clubs(id, code, name, status) VALUES (?, ?, ?, 'ACTIVE')", id, code, "Club " + code);
        return id;
    }

    private void addClubMemberWithChat(UUID userId, UUID clubId) {
        db.update("INSERT INTO memberships(id, user_id, club_id) VALUES (?, ?, ?)", UUID.randomUUID(), userId, clubId);
        for (String key : new String[]{"chat.view", "chat.send", "document.view"}) {
            UUID permId = db.queryForObject("SELECT id FROM permissions WHERE permission_key = ?", UUID.class, key);
            db.update("INSERT INTO user_permissions(user_id, permission_id, scope, club_id, granted_by) VALUES (?, ?, 'CLUB', ?, ?)",
                    userId, permId, clubId, admin);
        }
    }

    private JsonNode call(AbstractMockHttpServletRequestBuilder<?> request, String session, Object body, int status)
            throws Exception {
        TestSessions.attach(request, session);
        if (body != null) request.contentType("application/json").content(json.writeValueAsString(body));
        var res = mvc.perform(request).andReturn().getResponse();
        String content = res.getContentAsString();
        assertThat(res.getStatus()).as(content).isEqualTo(status);
        return content.isEmpty() ? json.nullNode() : json.readTree(content);
    }
}
