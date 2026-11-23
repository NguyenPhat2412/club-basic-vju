package com.vju.club.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.config.FacebookProperties;
import com.vju.club.error.ApiException;
import com.vju.club.service.FacebookGraphClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@Component
public class FacebookGraphClientImpl implements FacebookGraphClient {
    private static final Logger log = LoggerFactory.getLogger(FacebookGraphClientImpl.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final DateTimeFormatter FB_ISO_OFFSET = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssZ");

    private final FacebookProperties properties;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.vju.club.config.RuntimeIntegrationConfig runtimeIntegrationConfig;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public FacebookGraphClientImpl(FacebookProperties properties) {
        this.properties = properties;
    }

    private com.vju.club.config.RuntimeIntegrationConfig.EffectiveFacebook effectiveFacebook() {
        if (runtimeIntegrationConfig != null) {
            return runtimeIntegrationConfig.facebook();
        }
        return new com.vju.club.config.RuntimeIntegrationConfig.EffectiveFacebook(
                properties.getAppId(),
                properties.getAppSecret(),
                properties.getGraphVersion(),
                properties.getGraphBaseUrl(),
                properties.getOauthRedirectUri(),
                properties.getFrontendBaseUrl());
    }

    @Override
    public FbPageProfile fetchPageProfile(String pageAccessToken) {
        String fields = "id,name,link,fan_count,followers_count,picture.type(large){url}";
        JsonNode root = getJson("/me?fields=" + encode(fields) + "&access_token=" + encode(pageAccessToken));
        String pageId = text(root, "id");
        String pageName = text(root, "name");
        if (pageId == null || pageName == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FACEBOOK_INVALID_TOKEN",
                    "Token không trả về thông tin Fanpage hợp lệ. Hãy chắc chắn bạn đã chọn Page Access Token (không phải User Token).");
        }
        String link = text(root, "link");
        if (link == null) {
            link = "https://www.facebook.com/" + pageId;
        }
        String avatarUrl = root.path("picture").path("data").path("url").asText(null);
        int followers = root.path("followers_count").asInt(root.path("fan_count").asInt(0));
        int fans = root.path("fan_count").asInt(followers);
        return new FbPageProfile(pageId, pageName, link, avatarUrl, followers, fans);
    }

    @Override
    public List<FbPostRecord> fetchPagePosts(String pageId, String pageAccessToken, int limit) {
        int capped = Math.max(1, Math.min(limit, 50));
        String fields = "id,message,story,created_time,permalink_url,full_picture,shares,reactions.summary(total_count),comments.summary(total_count)";
        JsonNode root = getJson("/" + encode(pageId) + "/posts?fields=" + encode(fields)
                + "&limit=" + capped + "&access_token=" + encode(pageAccessToken));
        List<FbPostRecord> items = new ArrayList<>();
        JsonNode data = root.path("data");
        if (data.isArray()) {
            for (JsonNode node : data) {
                String postId = text(node, "id");
                if (postId == null) continue;
                String msg = text(node, "message");
                if (msg == null) msg = text(node, "story");
                String permalink = text(node, "permalink_url");
                if (permalink == null) permalink = "https://www.facebook.com/" + postId;
                String imageUrl = text(node, "full_picture");
                OffsetDateTime publishedAt = parseFacebookTime(text(node, "created_time"));
                int reactions = node.path("reactions").path("summary").path("total_count").asInt(0);
                int comments = node.path("comments").path("summary").path("total_count").asInt(0);
                int shares = node.path("shares").path("count").asInt(0);
                items.add(new FbPostRecord(postId, msg, permalink, imageUrl, publishedAt, reactions, comments, shares));
            }
        }
        return items;
    }

    @Override
    public String exchangeOAuthCodeForUserToken(String code, String redirectUri) {
        var fb = effectiveFacebook();
        JsonNode root = getJson("/oauth/access_token?client_id=" + encode(fb.appId())
                + "&redirect_uri=" + encode(redirectUri)
                + "&client_secret=" + encode(fb.appSecret())
                + "&code=" + encode(code));
        String token = text(root, "access_token");
        if (token == null) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "FACEBOOK_OAUTH_FAILED",
                    "Không thể đổi mã xác thực Facebook sang Access Token.");
        }
        return token;
    }

    @Override
    public String exchangeForLongLivedUserToken(String shortLivedUserToken) {
        var fb = effectiveFacebook();
        if (!fb.isOauthConfigured()) {
            return shortLivedUserToken;
        }
        try {
            JsonNode root = getJson("/oauth/access_token?grant_type=fb_exchange_token"
                    + "&client_id=" + encode(fb.appId())
                    + "&client_secret=" + encode(fb.appSecret())
                    + "&fb_exchange_token=" + encode(shortLivedUserToken));
            String longToken = text(root, "access_token");
            return longToken != null ? longToken : shortLivedUserToken;
        } catch (Exception e) {
            log.warn("Could not upgrade Facebook token to long-lived token, keeping original token: {}", e.getMessage());
            return shortLivedUserToken;
        }
    }

    @Override
    public List<FbManagedPage> fetchManagedPages(String userAccessToken) {
        String fields = "id,name,link,fan_count,followers_count,picture.type(large){url},access_token,tasks";
        JsonNode root = getJson("/me/accounts?fields=" + encode(fields)
                + "&limit=50&access_token=" + encode(userAccessToken));
        List<FbManagedPage> pages = new ArrayList<>();
        JsonNode data = root.path("data");
        if (data.isArray()) {
            for (JsonNode node : data) {
                String pageId = text(node, "id");
                String pageName = text(node, "name");
                String pageToken = text(node, "access_token");
                if (pageId == null || pageName == null || pageToken == null) continue;
                String link = text(node, "link");
                if (link == null) link = "https://www.facebook.com/" + pageId;
                String avatar = node.path("picture").path("data").path("url").asText(null);
                int followers = node.path("followers_count").asInt(node.path("fan_count").asInt(0));
                int fans = node.path("fan_count").asInt(followers);
                List<String> tasks = new ArrayList<>();
                JsonNode tasksNode = node.path("tasks");
                if (tasksNode.isArray()) {
                    for (JsonNode t : tasksNode) {
                        if (t.isTextual()) tasks.add(t.asText());
                    }
                }
                pages.add(new FbManagedPage(pageId, pageName, link, avatar, followers, fans, pageToken, tasks));
            }
        }
        return pages;
    }

    private JsonNode getJson(String pathAndQuery) {
        var fb = effectiveFacebook();
        String base = fb.graphBaseUrl().replaceAll("/+$", "");
        String version = fb.graphVersion().replaceAll("^/+|/+$", "");
        String url = base + "/" + version + pathAndQuery;
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(15))
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            JsonNode body = JSON.readTree(response.body());
            if (response.statusCode() >= 400 || body.has("error")) {
                throw mapGraphError(body.path("error"), response.statusCode());
            }
            return body;
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Facebook Graph API request failed: {}", e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "FACEBOOK_GRAPH_UNREACHABLE",
                    "Không thể kết nối tới Facebook Graph API. Vui lòng thử lại sau.");
        }
    }

    private ApiException mapGraphError(JsonNode errorNode, int statusCode) {
        int code = errorNode.path("code").asInt(0);
        String msg = errorNode.path("message").asText("Lỗi từ Facebook Graph API");
        if (code == 190) {
            return new ApiException(HttpStatus.BAD_REQUEST, "FACEBOOK_TOKEN_EXPIRED",
                    "Access Token Facebook không hợp lệ hoặc đã hết hạn. Vui lòng tạo token mới hoặc kết nối lại Fanpage.");
        }
        if (code == 10 || code == 200) {
            return new ApiException(HttpStatus.FORBIDDEN, "FACEBOOK_PERMISSION_MISSING",
                    "Token thiếu quyền đọc dữ liệu Fanpage (cần pages_show_list và pages_read_engagement trên Page Access Token). Chi tiết: " + msg);
        }
        HttpStatus httpStatus = statusCode >= 400 && statusCode < 500 ? HttpStatus.BAD_REQUEST : HttpStatus.BAD_GATEWAY;
        return new ApiException(httpStatus, "FACEBOOK_API_ERROR", "Facebook Graph API trả về lỗi: " + msg);
    }

    private static OffsetDateTime parseFacebookTime(String raw) {
        if (raw == null || raw.isBlank()) {
            return OffsetDateTime.now();
        }
        try {
            return OffsetDateTime.parse(raw, FB_ISO_OFFSET);
        } catch (DateTimeParseException ignored) {
            try {
                return OffsetDateTime.parse(raw);
            } catch (DateTimeParseException ignored2) {
                return OffsetDateTime.now();
            }
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private static String text(JsonNode node, String field) {
        JsonNode val = node.path(field);
        if (val.isMissingNode() || val.isNull()) return null;
        String s = val.asText();
        return s.isBlank() ? null : s;
    }
}
