package com.vju.club.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.config.AiProperties;
import com.vju.club.dto.record.ExtractedDigest;
import com.vju.club.entity.ChatChannel;
import com.vju.club.entity.ChatMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class ChatSummaryServiceImpl {
    private static final Logger log = LoggerFactory.getLogger(ChatSummaryServiceImpl.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    private final AiProperties aiProperties;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public ExtractedDigest analyzeMessages(ChatChannel channel, List<ChatMessage> messages) {
        if (aiProperties.getApiKey() != null && !aiProperties.getApiKey().isBlank()) {
            try {
                return callRemoteLlm(channel, messages);
            } catch (Exception e) {
                log.warn("Remote LLM call failed, falling back to built-in extractive summarizer: {}", e.getMessage());
            }
        }
        return buildExtractiveDigest(channel, messages);
    }

    public String toJsonArray(List<String> items) {
        try {
            return JSON.writeValueAsString(items == null ? Collections.emptyList() : items);
        } catch (Exception e) {
            return "[]";
        }
    }

    private ExtractedDigest callRemoteLlm(ChatChannel channel, List<ChatMessage> messages) throws Exception {
        StringBuilder transcript = new StringBuilder();
        for (ChatMessage msg : messages) {
            String speaker = msg.getSender() != null ? msg.getSender().getFullName() : "Member";
            transcript.append(speaker).append(": ").append(msg.getContent()).append("\n");
        }
        String prompt = "Bạn là trợ lý AI của CLB " + channel.getClub().getName() + " (kênh " + channel.getName() + "). "
                + "Hãy tóm tắt đoạn hội thoại sau và trả về đúng định dạng JSON object với 4 trường: "
                + "{\"summary\": \"...\", \"decisions\": [\"...\"], \"suggestedTasks\": [\"...\"], \"suggestedEvents\": [\"...\"]}.\n\n"
                + transcript;

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", aiProperties.getModel());
        payload.put("stream", false);
        payload.put("messages", List.of(
                Map.of("role", "system", "content", "Return only valid JSON object without markdown fences."),
                Map.of("role", "user", "content", prompt)
        ));

        String endpoint = aiProperties.getBaseUrl().replaceAll("/+$", "") + "/chat/completions";
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .timeout(Duration.ofSeconds(45))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + aiProperties.getApiKey().strip())
                .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(payload)))
                .build();

        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            throw new IllegalStateException("LLM HTTP " + res.statusCode());
        }
        String rawBody = res.body().strip();
        String content;
        String resolvedModel = aiProperties.getModel();
        if (rawBody.startsWith("data:")) {
            StringBuilder streamContent = new StringBuilder();
            for (String line : rawBody.split("\\R")) {
                String trimmed = line.strip();
                if (!trimmed.startsWith("data:")) continue;
                String jsonChunk = trimmed.substring(5).strip();
                if (jsonChunk.isEmpty() || "[DONE]".equals(jsonChunk)) continue;
                JsonNode chunkNode = JSON.readTree(jsonChunk);
                if (chunkNode.hasNonNull("model")) {
                    resolvedModel = chunkNode.path("model").asText(resolvedModel);
                }
                streamContent.append(chunkNode.at("/choices/0/delta/content").asText(""));
            }
            content = streamContent.toString().strip();
        } else {
            JsonNode root = JSON.readTree(rawBody);
            resolvedModel = root.path("model").asText(aiProperties.getModel());
            content = root.at("/choices/0/message/content").asText("").strip();
        }
        if (content.startsWith("```")) {
            content = content.replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
        }
        int firstBrace = content.indexOf('{');
        int lastBrace = content.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            content = content.substring(firstBrace, lastBrace + 1);
        }
        JsonNode parsed = JSON.readTree(content);
        return new ExtractedDigest(
                parsed.path("summary").asText("Đã tóm tắt " + messages.size() + " tin nhắn."),
                readList(parsed.path("decisions")),
                readList(parsed.path("suggestedTasks")),
                readList(parsed.path("suggestedEvents")),
                resolvedModel
        );
    }

    private static List<String> readList(JsonNode arrayNode) {
        if (!arrayNode.isArray()) return Collections.emptyList();
        List<String> list = new ArrayList<>();
        arrayNode.forEach(item -> {
            String text = item.asText("").strip();
            if (!text.isEmpty()) list.add(text);
        });
        return list;
    }

    private static ExtractedDigest buildExtractiveDigest(ChatChannel channel, List<ChatMessage> messages) {
        Set<String> speakers = new LinkedHashSet<>();
        List<String> decisions = new ArrayList<>();
        List<String> suggestedTasks = new ArrayList<>();
        List<String> suggestedEvents = new ArrayList<>();
        List<String> highlights = new ArrayList<>();

        for (ChatMessage msg : messages) {
            String speaker = msg.getSender() != null ? msg.getSender().getFullName() : "Thành viên";
            speakers.add(speaker);
            String text = msg.getContent().strip();
            String lower = text.toLowerCase(Locale.ROOT);
            if (highlights.size() < 3) {
                highlights.add(speaker + ": " + text);
            }
            if (lower.contains("chốt") || lower.contains("quyết định") || lower.contains("thống nhất") || lower.contains("dong y")) {
                decisions.add(text);
            }
            if (lower.contains("task") || lower.contains("nhiệm vụ") || lower.contains("phụ trách")
                    || lower.contains("giao") || lower.contains("deadline") || lower.contains("chuẩn bị")) {
                suggestedTasks.add(text);
            }
            if (lower.contains("họp") || lower.contains("lịch") || lower.contains("sự kiện")
                    || lower.contains("meeting") || lower.contains("workshop") || lower.contains("tuần sau")) {
                suggestedEvents.add(text);
            }
        }

        String summary = "Kênh \"" + channel.getName() + "\" có " + messages.size()
                + " tin nhắn từ " + String.join(", ", speakers) + ". Nội dung chính: "
                + String.join(" | ", highlights);
        return new ExtractedDigest(summary, decisions, suggestedTasks, suggestedEvents, "built-in-extractive-v1");
    }
}
