package com.vju.club.service.impl;

import com.vju.club.annotation.RequirePermission;
import com.vju.club.common.ChatConstants;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.dto.record.ExtractedDigest;
import com.vju.club.dto.request.CreateChatChannelRequest;
import com.vju.club.dto.request.SendChatMessageRequest;
import com.vju.club.dto.request.SummarizeChatRequest;
import com.vju.club.dto.response.AiSummaryResponse;
import com.vju.club.dto.response.ChatAttachmentResponse;
import com.vju.club.dto.response.ChatChannelResponse;
import com.vju.club.dto.response.ChatMessageResponse;
import com.vju.club.dto.response.ChatRealtimeEvent;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.entity.AiSummary;
import com.vju.club.entity.ChatChannel;
import com.vju.club.entity.ChatMessage;
import com.vju.club.entity.Club;
import com.vju.club.entity.Department;
import com.vju.club.entity.Document;
import com.vju.club.entity.Event;
import com.vju.club.entity.User;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.ChatChannelType;
import com.vju.club.enums.ChatSenderType;
import com.vju.club.enums.ClubStatus;
import com.vju.club.enums.DocumentScope;
import com.vju.club.enums.DocumentVisibility;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.ChatMapper;
import com.vju.club.repository.AiSummaryRepository;
import com.vju.club.repository.ChatChannelReadRepository;
import com.vju.club.repository.ChatChannelRepository;
import com.vju.club.repository.ChatMessageRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.repository.DocumentRepository;
import com.vju.club.repository.EventRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.AuditService;
import com.vju.club.service.ChatService;
import com.vju.club.service.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {
    private static final int SUMMARIES_PER_HOUR = 10;
    private static final int MAX_MESSAGE_LENGTH = 4000;
    private static final Sort MESSAGE_SORT = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private final ChatChannelRepository channelRepository;
    private final ChatMessageRepository messageRepository;
    private final ChatChannelReadRepository channelReadRepository;
    private final AiSummaryRepository summaryRepository;
    private final ClubRepository clubRepository;
    private final DepartmentRepository departmentRepository;
    private final EventRepository eventRepository;
    private final DocumentRepository documentRepository;
    private final MembershipRepository membershipRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final UserRepository userRepository;
    private final PermissionAuthorizationService authorizationService;
    private final ChatAccessPolicy chatAccessPolicy;
    private final DocumentAccessPolicy documentAccessPolicy;
    private final ChatMediaService chatMediaService;
    private final ChatSummaryServiceImpl summaryAnalyzer;
    private final AuditService auditService;
    private final ChatMapper chatMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final TransactionTemplate transactionTemplate;
    private final Clock clock;

    // optional so hand-built unit tests keep working; absent means the built-in defaults
    @Autowired(required = false)
    private SystemSettingsService settingsService;
    @Autowired(required = false)
    private ChatAndVaultNotifier notifier;
    @Autowired(required = false)
    private ChatDeliveryReceiptService deliveryReceiptService;
    @Autowired(required = false)
    private ChatReactionService reactionService;

    @Override
    @Transactional
    public ChatChannelResponse createChannel(Actor actor, UUID clubId, CreateChatChannelRequest request) {
        if (!authorizationService.hasAnyPermission(actor, ChatConstants.PERMISSION_SEND)) {
            authorizationService.require(actor, ChatConstants.PERMISSION_SEND, clubId, null);
        }
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
        if (club.getStatus() != ClubStatus.ACTIVE) throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        Department department = request.departmentId() == null ? null : departmentRepository.findById(request.departmentId())
                .filter(d -> d.getClub().getId().equals(clubId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DEPARTMENT_NOT_FOUND", "Department not found in club"));
        authorizationService.require(actor, ChatConstants.PERMISSION_SEND, clubId, department == null ? null : department.getId());
        chatMediaService.requireChannelQuota(channelRepository.countByClub_Id(clubId));
        Event event = request.eventId() == null ? null : eventRepository.findById(request.eventId())
                .filter(e -> e.getClub().getId().equals(clubId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Event not found in club"));

        ChatChannel channel = new ChatChannel();
        channel.setClub(club);
        channel.setDepartment(department);
        channel.setEvent(event);
        channel.setName(request.name().strip());
        ChatChannelType resolvedType = request.channelType() != null
                ? request.channelType()
                : event != null ? ChatChannelType.EVENT_THREAD
                : department != null ? ChatChannelType.DEPARTMENT : ChatChannelType.CLUB_GENERAL;
        if (resolvedType == ChatChannelType.DEPARTMENT && department == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Department ID is required for DEPARTMENT channels");
        }
        if (resolvedType == ChatChannelType.EVENT_THREAD && event == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Event ID is required for EVENT_THREAD channels");
        }
        channel.setChannelType(resolvedType);

        ChatChannel saved = channelRepository.save(channel);
        auditService.record(actor.id(), AuditAction.CHAT_CHANNEL_CREATED, saved.getId(), club.getId(),
                null, Map.of("name", saved.getName(), "channelType", saved.getChannelType()));

        ChatChannelResponse response = chatMapper.toChannelResponse(saved);
        eventPublisher.publishEvent(new ChatRealtimeEvent(
                "CHANNEL_CREATED", clubId, saved.getId(), actor.id(), null,
                null, response, channelRecipients(saved), OffsetDateTime.now(clock)
        ));
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatChannelResponse> listChannels(Actor actor, UUID clubId) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
        boolean officer = authorizationService.hasPermission(actor, ChatConstants.PERMISSION_VIEW, club.getId(), null);
        if (!officer && !chatAccessPolicy.isActiveMember(actor, club.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        Set<UUID> myDeptIds = officer
                ? Set.of()
                : Set.copyOf(departmentMemberRepository.findActiveDepartmentIdsInClub(club.getId(), actor.id()));
        List<ChatChannel> visible = channelRepository.findByClub_IdOrderByCreatedAtAsc(club.getId()).stream()
                .filter(ch -> officer || ch.getDepartment() == null || myDeptIds.contains(ch.getDepartment().getId()))
                .toList();
        if (visible.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = visible.stream().map(ChatChannel::getId).toList();
        Map<UUID, ChatMessageRepository.ChannelActivityRow> activity = messageRepository
                .summarizeActivity(ids, actor.id())
                .stream()
                .collect(Collectors.toMap(ChatMessageRepository.ChannelActivityRow::getChannelId, Function.identity()));

        return visible.stream().map(ch -> {
            ChatChannelResponse base = chatMapper.toChannelResponse(ch);
            var row = activity.get(ch.getId());
            if (row == null) return base;
            OffsetDateTime lastAt = row.getLastMessageAt() != null
                    ? row.getLastMessageAt().atOffset(java.time.ZoneOffset.UTC)
                    : null;
            return base.withActivity(row.getUnreadCount(), lastAt);
        }).toList();
    }

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(Actor actor, UUID channelId, SendChatMessageRequest request) {
        ChatChannel channel = chatAccessPolicy.requireChannelAccessById(actor, channelId, ChatConstants.PERMISSION_SEND, true);
        chatMediaService.requireMessageRateLimit(actor.id());
        User sender = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        ChatMessage replyTo = null;
        if (request.replyToId() != null) {
            replyTo = messageRepository.findWithRelationsById(request.replyToId())
                    .filter(m -> m.getChannel().getId().equals(channelId))
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MESSAGE_NOT_FOUND", "Replied message not found in channel"));
        }

        Document attachment = null;
        if (request.documentId() != null) {
            attachment = documentAccessPolicy.requireVisible(actor, documentRepository.findWithRelationsById(request.documentId()));
            if (attachment.isDeleted()) {
                throw new ApiException(HttpStatus.GONE, "DOCUMENT_DELETED", "Cannot attach a deleted document");
            }
            if (attachment.getScope() != DocumentScope.SYSTEM
                    && !attachment.getClub().getId().equals(channel.getClub().getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "DOCUMENT_CLUB_MISMATCH",
                        "Attached document must belong to this club or the system vault");
            }
            if (attachment.getVisibility() == DocumentVisibility.OFFICERS
                    || (attachment.getScope() == DocumentScope.DEPARTMENT
                            && (channel.getDepartment() == null
                                    || !channel.getDepartment().getId().equals(attachment.getDepartment().getId())))) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "DOCUMENT_CHANNEL_SCOPE_MISMATCH",
                        "Restricted document cannot be shared in this channel");
            }
        }

        ChatMessage message = new ChatMessage();
        message.setChannel(channel);
        message.setSender(sender);
        message.setSenderType(ChatSenderType.USER);
        String content = request.content() == null ? "" : request.content().strip();
        boolean hasAttachments = request.attachmentIds() != null && !request.attachmentIds().isEmpty();
        if (content.isEmpty() && attachment == null && !hasAttachments) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Message content or attachment is required");
        }
        int maxLength = settingsService != null ? settingsService.current().chatMaxMessageLength() : MAX_MESSAGE_LENGTH;
        if (content.length() > maxLength) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MESSAGE_TOO_LONG", "A message may be at most " + maxLength + " characters");
        }
        message.setContent(content);
        message.setReplyTo(replyTo);
        message.setDocument(attachment);
        OffsetDateTime now = OffsetDateTime.now(clock);
        Set<UUID> recipients = new LinkedHashSet<>(channelRecipients(channel));
        if (replyTo != null && replyTo.getSender() != null) recipients.add(replyTo.getSender().getId());
        if (deliveryReceiptService != null) {
            deliveryReceiptService.initializeMessageDelivery(message, actor.id(), recipients, now);
        }
        ChatMessage saved = messageRepository.saveAndFlush(message);
        List<ChatAttachmentResponse> attached = chatMediaService.bindAttachments(actor, channel, saved, request.attachmentIds());
        String tempId = request.clientTempId() != null && !request.clientTempId().isBlank() ? request.clientTempId().strip() : null;

        channelReadRepository.upsertRead(channelId, actor.id(), saved.getId(), saved.getCreatedAt());
        ChatMessageResponse response = chatMapper.toMessageResponse(saved).withAttachments(attached, tempId);
        ChatChannelResponse channelResp = chatMapper.toChannelResponse(channel);
        if (notifier != null) {
            notifier.notifyChatInteractions(channel, sender, saved, content, replyTo, recipients, attachment != null || !attached.isEmpty());
        }
        eventPublisher.publishEvent(new ChatRealtimeEvent(
                "MESSAGE_CREATED", channel.getClub().getId(), channelId,
                actor.id(), sender.getFullName(), response, channelResp,
                List.copyOf(recipients), now
        ));
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ChatMessageResponse> listMessages(Actor actor, UUID channelId, UUID beforeId, int offset, int limit) {
        chatAccessPolicy.requireChannelAccessById(actor, channelId, ChatConstants.PERMISSION_VIEW, false);
        if (beforeId != null) {
            ChatMessage cursor = messageRepository.findById(beforeId)
                    .filter(m -> m.getChannel().getId().equals(channelId))
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MESSAGE_NOT_FOUND", "Cursor message not found"));
            List<ChatMessageResponse> items = enrich(channelId, messageRepository.findBeforeCursor(
                    channelId, cursor.getCreatedAt(), cursor.getId(), PageRequest.of(0, limit)));
            return new PageResponse<>(items, messageRepository.countByChannel_Id(channelId), 0, limit);
        }
        var page = messageRepository.findByChannel_IdOrderByCreatedAtDesc(
                channelId, new OffsetLimitRequest(offset, limit, MESSAGE_SORT));
        return new PageResponse<>(enrich(channelId, page.getContent()), page.getTotalElements(), offset, limit);
    }

    private List<ChatMessageResponse> enrich(UUID channelId, List<ChatMessage> entities) {
        List<ChatMessageResponse> items = chatMediaService.enrichMessages(
                entities.stream().map(chatMapper::toMessageResponse).toList());
        if (deliveryReceiptService != null) items = deliveryReceiptService.enrichReceipts(channelId, items);
        return reactionService != null ? reactionService.enrichReactions(items) : items;
    }

    @Override
    @Transactional
    public void markChannelRead(Actor actor, UUID channelId, UUID lastReadMessageId) {
        ChatChannel channel = chatAccessPolicy.requireChannelAccessById(actor, channelId, ChatConstants.PERMISSION_VIEW, false);
        OffsetDateTime readAt = OffsetDateTime.now(clock);
        if (lastReadMessageId != null) {
            ChatMessage target = messageRepository.findById(lastReadMessageId)
                    .filter(m -> m.getChannel().getId().equals(channelId))
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MESSAGE_NOT_FOUND", "Message not found in channel"));
            if (target.getCreatedAt().isAfter(readAt)) readAt = target.getCreatedAt();
        }
        if (deliveryReceiptService != null) {
            deliveryReceiptService.markChannelReadAndBroadcast(channel, actor.id(), lastReadMessageId, readAt, channelRecipients(channel));
        } else {
            channelReadRepository.upsertRead(channelId, actor.id(), lastReadMessageId, readAt);
        }
    }

    @Override
    public AiSummaryResponse summarizeChannel(Actor actor, UUID channelId, SummarizeChatRequest request) {
        record PreSummary(ChatChannel channel, List<ChatMessage> userMessages) { }
        PreSummary pre = Objects.requireNonNull(transactionTemplate.execute(status -> {
            ChatChannel ch = chatAccessPolicy.requireChannelAccessById(actor, channelId, ChatConstants.PERMISSION_SUMMARIZE, true);
            requireSummaryQuota(actor.id());
            int limit = request != null && request.messageLimit() != null ? request.messageLimit() : 50;
            List<ChatMessage> recentDesc = messageRepository.findByChannel_IdOrderByCreatedAtDesc(
                    channelId, new OffsetLimitRequest(0, limit, MESSAGE_SORT)).getContent();
            List<ChatMessage> msgs = new ArrayList<>(
                    recentDesc.stream().filter(m -> m.getSenderType() == ChatSenderType.USER).toList());
            Collections.reverse(msgs);
            if (msgs.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_CHANNEL", "Cannot summarize a channel with no user messages");
            }
            if (!userRepository.existsById(actor.id())) {
                throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found");
            }
            return new PreSummary(ch, msgs);
        }));

        ExtractedDigest digest = summaryAnalyzer.analyzeMessages(pre.channel(), pre.userMessages());

        return Objects.requireNonNull(transactionTemplate.execute(status -> {
            ChatChannel channel = chatAccessPolicy.requireChannelAccessById(actor, channelId, ChatConstants.PERMISSION_SUMMARIZE, true);
            requireSummaryQuota(actor.id());
            User requester = userRepository.findById(actor.id())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
            AiSummary summary = new AiSummary();
            summary.setChannel(channel);
            summary.setRequestedBy(requester);
            summary.setMessageCount(pre.userMessages().size());
            summary.setSummary(digest.summary());
            summary.setDecisionsJson(summaryAnalyzer.toJsonArray(digest.decisions()));
            summary.setSuggestedTasksJson(summaryAnalyzer.toJsonArray(digest.suggestedTasks()));
            summary.setSuggestedEventsJson(summaryAnalyzer.toJsonArray(digest.suggestedEvents()));
            summary.setModel(digest.model());
            AiSummary saved = summaryRepository.save(summary);

            if (request == null || !Boolean.FALSE.equals(request.postToChannel())) {
                int maxLength = settingsService != null ? settingsService.current().chatMaxMessageLength() : MAX_MESSAGE_LENGTH;
                ChatMessage botMsg = new ChatMessage();
                botMsg.setChannel(channel);
                botMsg.setSender(null);
                botMsg.setSenderType(ChatSenderType.AI_BOT);
                botMsg.setContent(fit("[AI Tóm tắt thảo luận]\n" + digest.summary(), maxLength));
                ChatMessage savedBot = messageRepository.saveAndFlush(botMsg);
                eventPublisher.publishEvent(new ChatRealtimeEvent(
                        "SUMMARY_POSTED", channel.getClub().getId(), channelId,
                        actor.id(), "AI Bot", chatMapper.toMessageResponse(savedBot), null,
                        channelRecipients(channel), OffsetDateTime.now(clock)
                ));
            }
            auditService.record(actor.id(), AuditAction.CHAT_SUMMARIZED, channel.getId(), channel.getClub().getId(),
                    null, Map.of("summaryId", saved.getId(), "messageCount", pre.userMessages().size(), "model", digest.model()));
            return chatMapper.toSummaryResponse(saved);
        }));
    }

    private void requireSummaryQuota(UUID actorId) {
        int summariesPerHour = settingsService != null ? settingsService.current().chatSummariesPerHour() : SUMMARIES_PER_HOUR;
        if (summariesPerHour == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "AI_SUMMARY_DISABLED", "AI summaries are turned off by the administrator");
        }
        if (summaryRepository.countByRequestedBy_IdAndCreatedAtAfter(actorId,
                OffsetDateTime.now(clock).minusHours(1)) >= summariesPerHour) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "SUMMARY_LIMIT_REACHED",
                    "At most " + summariesPerHour + " AI summaries per hour");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiSummaryResponse> listSummaries(Actor actor, UUID channelId) {
        chatAccessPolicy.requireChannelAccessById(actor, channelId, ChatConstants.PERMISSION_VIEW, false);
        return summaryRepository.findByChannel_IdOrderByCreatedAtDesc(channelId).stream()
                .map(chatMapper::toSummaryResponse)
                .toList();
    }

    private List<UUID> channelRecipients(ChatChannel channel) {
        return channel.getDepartment() != null
                ? departmentMemberRepository.findActiveUserIdsByDepartmentId(channel.getDepartment().getId())
                : membershipRepository.findActiveUserIdsByClubId(channel.getClub().getId());
    }

    private static String fit(String text, int max) { return text.length() <= max ? text : text.substring(0, max - 1) + "…"; }
}
