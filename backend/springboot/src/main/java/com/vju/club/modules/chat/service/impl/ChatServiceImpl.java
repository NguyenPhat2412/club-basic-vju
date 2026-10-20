package com.vju.club.modules.chat.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.config.AiProperties;
import com.vju.club.error.ApiException;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.chat.common.ChatConstants;
import com.vju.club.modules.chat.dto.request.CreateChatChannelRequest;
import com.vju.club.modules.chat.dto.request.SendChatMessageRequest;
import com.vju.club.modules.chat.dto.request.SummarizeChatRequest;
import com.vju.club.modules.chat.dto.response.AiSummaryResponse;
import com.vju.club.modules.chat.dto.response.ChatChannelResponse;
import com.vju.club.modules.chat.dto.response.ChatMessageResponse;
import com.vju.club.modules.chat.entity.AiSummary;
import com.vju.club.modules.chat.entity.ChatChannel;
import com.vju.club.modules.chat.entity.ChatMessage;
import com.vju.club.modules.chat.enums.ChatChannelType;
import com.vju.club.modules.chat.enums.ChatSenderType;
import com.vju.club.modules.chat.mapper.ChatMapper;
import com.vju.club.modules.chat.repository.AiSummaryRepository;
import com.vju.club.modules.chat.repository.ChatChannelRepository;
import com.vju.club.modules.chat.repository.ChatMessageRepository;
import com.vju.club.modules.chat.service.ChatService;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.modules.event.entity.Event;
import com.vju.club.modules.event.repository.EventRepository;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.modules.permission.annotation.RequirePermission;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {
    private static final Logger log = LoggerFactory.getLogger(ChatServiceImpl.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Sort MESSAGE_SORT = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"));

    private final ChatChannelRepository channelRepository;
    private final ChatMessageRepository messageRepository;
    private final AiSummaryRepository summaryRepository;
    private final ClubRepository clubRepository;
    private final DepartmentRepository departmentRepository;
    private final EventRepository eventRepository;
    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final PermissionAuthorizationService authorizationService;
    private final AuditService auditService;
    private final AiProperties aiProperties;
    private final ChatMapper chatMapper;

    @Override
    @Transactional
    @RequirePermission(value = ChatConstants.PERMISSION_SEND, clubId = "clubId")
    public ChatChannelResponse createChannel(Actor actor, UUID clubId, CreateChatChannelRequest request) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }

        Department department = null;
        if (request.departmentId() != null) {
            department = departmentRepository.findById(request.departmentId())
                    .filter(d -> d.getClub().getId().equals(clubId))
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DEPARTMENT_NOT_FOUND", "Department not found in club"));
        }

        Event event = null;
        if (request.eventId() != null) {
            event = eventRepository.findById(request.eventId())
                    .filter(e -> e.getClub().getId().equals(clubId))
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found in club"));
        }

        ChatChannel channel = new ChatChannel();
        channel.setClub(club);
        channel.setDepartment(department);
        channel.setEvent(event);
        channel.setName(request.name().strip());
        if (request.channelType() != null) {
            channel.setChannelType(request.channelType());
        } else if (event != null) {
            channel.setChannelType(ChatChannelType.EVENT_THREAD);
        } else if (department != null) {
            channel.setChannelType(ChatChannelType.DEPARTMENT);
        } else {
            channel.setChannelType(ChatChannelType.CLUB_GENERAL);
        }

        ChatChannel saved = channelRepository.save(channel);
        auditService.record(actor.id(), AuditAction.CHAT_CHANNEL_CREATED, saved.getId(), club.getId(),
                null, Map.of("name", saved.getName(), "channelType", saved.getChannelType()));
        return chatMapper.toChannelResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatChannelResponse> listChannels(Actor actor, UUID clubId) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
        requireClubChatAccess(actor, club.getId(), ChatConstants.PERMISSION_VIEW);
        return channelRepository.findByClub_IdOrderByCreatedAtAsc(club.getId()).stream()
                .map(chatMapper::toChannelResponse)
                .toList();
    }

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(Actor actor, UUID channelId, SendChatMessageRequest request) {
        ChatChannel channel = channelRepository.findWithRelationsById(channelId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CHANNEL_NOT_FOUND", "Chat channel not found"));
        requireClubChatAccess(actor, channel.getClub().getId(), ChatConstants.PERMISSION_SEND);

        User sender = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        ChatMessage message = new ChatMessage();
        message.setChannel(channel);
        message.setSender(sender);
        message.setSenderType(ChatSenderType.USER);
        message.setContent(request.content().strip());
        ChatMessage saved = messageRepository.save(message);
        return chatMapper.toMessageResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ChatMessageResponse> listMessages(Actor actor, UUID channelId, int offset, int limit) {
        ChatChannel channel = channelRepository.findWithRelationsById(channelId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CHANNEL_NOT_FOUND", "Chat channel not found"));
        requireClubChatAccess(actor, channel.getClub().getId(), ChatConstants.PERMISSION_VIEW);

        var page = messageRepository.findByChannel_IdOrderByCreatedAtDesc(
                channelId, new OffsetLimitRequest(offset, limit, MESSAGE_SORT));
        return new PageResponse<>(page.getContent().stream().map(chatMapper::toMessageResponse).toList(),
                page.getTotalElements(), offset, limit);
    }

    @Override
    @Transactional
    public AiSummaryResponse summarizeChannel(Actor actor, UUID channelId, SummarizeChatRequest request) {
        ChatChannel channel = channelRepository.findWithRelationsById(channelId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CHANNEL_NOT_FOUND", "Chat channel not found"));
        requireClubChatAccess(actor, channel.getClub().getId(), ChatConstants.PERMISSION_SUMMARIZE);

        int limit = request != null && request.messageLimit() != null ? request.messageLimit() : 50;
        List<ChatMessage> recentDesc = messageRepository.findByChannel_IdOrderByCreatedAtDesc(
                channelId, new OffsetLimitRequest(0, limit, MESSAGE_SORT)).getContent();
        List<ChatMessage> userMessages = new ArrayList<>(
                recentDesc.stream().filter(m -> m.getSenderType() == ChatSenderType.USER).toList());
        Collections.reverse(userMessages);

        if (userMessages.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_CHANNEL",
                    "Cannot summarize a channel with no user messages");
        }

        User requester = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        ExtractedDigest digest = analyzeMessages(channel, userMessages);
        AiSummary summary = new AiSummary();
        summary.setChannel(channel);
        summary.setRequestedBy(requester);
        summary.setMessageCount(userMessages.size());
        summary.setSummary(digest.summary());
        summary.setDecisionsJson(toJsonArray(digest.decisions()));
        summary.setSuggestedTasksJson(toJsonArray(digest.suggestedTasks()));
        summary.setSuggestedEventsJson(toJsonArray(digest.suggestedEvents()));
        summary.setModel(digest.model());
        AiSummary saved = summaryRepository.save(summary);

        boolean postToChannel = request == null || !Boolean.FALSE.equals(request.postToChannel());
        if (postToChannel) {
            ChatMessage botMsg = new ChatMessage();
            botMsg.setChannel(channel);
            botMsg.setSender(null);
            botMsg.setSenderType(ChatSenderType.AI_BOT);
            botMsg.setContent("[AI Tóm tắt thảo luận]\n" + digest.summary());
            messageRepository.save(botMsg);
        }

        auditService.record(actor.id(), AuditAction.CHAT_SUMMARIZED, channel.getId(), channel.getClub().getId(),
                null, Map.of("summaryId", saved.getId(), "messageCount", userMessages.size(), "model", digest.model()));
        return chatMapper.toSummaryResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiSummaryResponse> listSummaries(Actor actor, UUID channelId) {
        ChatChannel channel = channelRepository.findWithRelationsById(channelId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CHANNEL_NOT_FOUND", "Chat channel not found"));
        requireClubChatAccess(actor, channel.getClub().getId(), ChatConstants.PERMISSION_VIEW);
        return summaryRepository.findByChannel_IdOrderByCreatedAtDesc(channelId).stream()
                .map(chatMapper::toSummaryResponse)
                .toList();
    }

    private void requireClubChatAccess(Actor actor, UUID clubId, String permissionKey) {
        boolean allowed = authorizationService.hasPermission(actor, permissionKey, clubId, null)
                || authorizationService.hasPermission(actor, "club.view", clubId, null)
                || membershipRepository.existsByUser_IdAndClub_IdAndStatus(actor.id(), clubId, MembershipStatus.ACTIVE);
        if (!allowed) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
    }

    private record ExtractedDigest(String summary, List<String> decisions, List<String> suggestedTasks,
                                   List<String> suggestedEvents, String model) {
    }

    private ExtractedDigest analyzeMessages(ChatChannel channel, List<ChatMessage> messages) {
        if (aiProperties.getApiKey() != null && !aiProperties.getApiKey().isBlank()) {
            try {
                return callRemoteLlm(channel, messages);
            } catch (Exception e) {
                log.warn("Remote LLM call failed, falling back to built-in extractive summarizer: {}", e.getMessage());
            }
        }
        return buildExtractiveDigest(channel, messages);
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

        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        String endpoint = aiProperties.getBaseUrl().replaceAll("/+$", "") + "/chat/completions";
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .timeout(Duration.ofSeconds(45))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + aiProperties.getApiKey().strip())
                .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(payload)))
                .build();

        HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
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

    private static String toJsonArray(List<String> items) {
        try {
            return JSON.writeValueAsString(items == null ? Collections.emptyList() : items);
        } catch (Exception e) {
            return "[]";
        }
    }
}
