package com.vju.club.service.impl;

import com.vju.club.common.ChatConstants;
import com.vju.club.dto.request.UpdateChatMessageRequest;
import com.vju.club.dto.response.ChatChannelResponse;
import com.vju.club.dto.response.ChatMessageResponse;
import com.vju.club.dto.response.ChatRealtimeEvent;
import com.vju.club.entity.ChatChannel;
import com.vju.club.entity.ChatMessage;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.ChatSenderType;
import com.vju.club.enums.ClubStatus;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.ChatMapper;
import com.vju.club.repository.ChatChannelRepository;
import com.vju.club.repository.ChatMessageRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.security.Actor;
import com.vju.club.service.AuditService;
import com.vju.club.service.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatModerationService {
    private static final int DEFAULT_MAX_MESSAGE_LENGTH = 4000;

    private final ChatChannelRepository channelRepository;
    private final ChatMessageRepository messageRepository;
    private final MembershipRepository membershipRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final ChatAccessPolicy chatAccessPolicy;
    private final ChatMediaService chatMediaService;
    private final AuditService auditService;
    private final ChatMapper chatMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    @Autowired(required = false)
    private SystemSettingsService settingsService;
    @Autowired(required = false)
    private ChatDeliveryReceiptService deliveryReceiptService;
    @Autowired(required = false)
    private ChatReactionService reactionService;

    @Transactional
    public void deleteChannel(Actor actor, UUID clubId, UUID channelId) {
        ChatChannel channel = channelRepository.findWithRelationsById(channelId)
                .filter(ch -> ch.getClub().getId().equals(clubId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CHANNEL_NOT_FOUND", "Chat channel not found in club"));
        if (channel.getClub().getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
        if (!chatAccessPolicy.canManageChannel(actor, channel)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied to delete this chat channel");
        }
        ChatChannelResponse snapshot = chatMapper.toChannelResponse(channel);
        List<UUID> recipients = channelRecipients(channel);
        chatMediaService.deleteAttachmentsForChannel(channelId);
        channelRepository.delete(channel);
        channelRepository.flush();
        auditService.record(actor.id(), AuditAction.CHAT_CHANNEL_DELETED, channelId, clubId,
                Map.of("name", snapshot.name(), "channelType", snapshot.channelType()), null);
        eventPublisher.publishEvent(new ChatRealtimeEvent(
                "CHANNEL_DELETED", clubId, channelId, actor.id(), null,
                null, snapshot, recipients, OffsetDateTime.now(clock)
        ));
    }

    @Transactional
    public ChatMessageResponse updateMessage(Actor actor, UUID channelId, UUID messageId, UpdateChatMessageRequest request) {
        ChatChannel channel = chatAccessPolicy.requireChannelAccessById(actor, channelId, ChatConstants.PERMISSION_SEND, true);
        ChatMessage message = messageRepository.findWithRelationsById(messageId)
                .filter(m -> m.getChannel().getId().equals(channelId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MESSAGE_NOT_FOUND", "Message not found in channel"));
        if (message.getSenderType() != ChatSenderType.USER
                || message.getSender() == null
                || !message.getSender().getId().equals(actor.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Only the message sender can edit this message");
        }
        String nextContent = request.content() == null ? "" : request.content().strip();
        if (nextContent.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Message content is required");
        }
        int maxLength = settingsService != null ? settingsService.current().chatMaxMessageLength() : DEFAULT_MAX_MESSAGE_LENGTH;
        if (nextContent.length() > maxLength) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MESSAGE_TOO_LONG", "A message may be at most " + maxLength + " characters");
        }
        String prevContent = message.getContent() == null ? "" : message.getContent();
        OffsetDateTime now = OffsetDateTime.now(clock);
        message.setContent(nextContent);
        message.setEditedAt(now);
        ChatMessage saved = messageRepository.saveAndFlush(message);
        ChatMessageResponse response = enrichSingle(channelId, saved);
        Set<UUID> recipients = new LinkedHashSet<>(channelRecipients(channel));
        recipients.add(actor.id());
        auditService.record(actor.id(), AuditAction.CHAT_MESSAGE_UPDATED, channelId, channel.getClub().getId(),
                Map.of("messageId", messageId, "content", fit(prevContent, 200)),
                Map.of("messageId", messageId, "content", fit(nextContent, 200)));
        eventPublisher.publishEvent(new ChatRealtimeEvent(
                "MESSAGE_UPDATED", channel.getClub().getId(), channelId,
                actor.id(), message.getSender().getFullName(), response, chatMapper.toChannelResponse(channel),
                List.copyOf(recipients), now
        ));
        return response;
    }

    @Transactional
    public void deleteMessage(Actor actor, UUID channelId, UUID messageId) {
        ChatChannel channel = channelRepository.findWithRelationsById(channelId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CHANNEL_NOT_FOUND", "Chat channel not found"));
        if (channel.getClub().getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
        ChatMessage message = messageRepository.findWithRelationsById(messageId)
                .filter(m -> m.getChannel().getId().equals(channelId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MESSAGE_NOT_FOUND", "Message not found in channel"));
        boolean isOwnMessage = message.getSender() != null && message.getSender().getId().equals(actor.id());
        if (isOwnMessage) {
            chatAccessPolicy.requireChannelAccess(actor, channel, ChatConstants.PERMISSION_SEND, true);
        } else if (!chatAccessPolicy.canModerateMessages(actor, channel)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied to delete this message");
        }

        ChatMessageResponse snapshot = chatMapper.toMessageResponse(message);
        Set<UUID> recipients = new LinkedHashSet<>(channelRecipients(channel));
        if (message.getSender() != null) {
            recipients.add(message.getSender().getId());
        }
        String senderRef = message.getSender() != null ? message.getSender().getId().toString() : "AI_BOT";
        messageRepository.clearReplyReferences(messageId);
        chatMediaService.deleteAttachmentsForMessage(messageId);
        messageRepository.deleteById(messageId);
        messageRepository.flush();

        auditService.record(actor.id(), AuditAction.CHAT_MESSAGE_DELETED, channelId, channel.getClub().getId(),
                Map.of("messageId", messageId, "senderId", senderRef), null);
        eventPublisher.publishEvent(new ChatRealtimeEvent(
                "MESSAGE_DELETED", channel.getClub().getId(), channelId,
                actor.id(), null, snapshot, chatMapper.toChannelResponse(channel),
                List.copyOf(recipients), OffsetDateTime.now(clock)
        ));
    }

    private ChatMessageResponse enrichSingle(UUID channelId, ChatMessage entity) {
        List<ChatMessageResponse> items = chatMediaService.enrichMessages(List.of(chatMapper.toMessageResponse(entity)));
        if (deliveryReceiptService != null) items = deliveryReceiptService.enrichReceipts(channelId, items);
        if (reactionService != null) items = reactionService.enrichReactions(items);
        return items.getFirst();
    }

    private List<UUID> channelRecipients(ChatChannel channel) {
        if (channel.getDepartment() != null) {
            return departmentMemberRepository.findActiveUserIdsByDepartmentId(channel.getDepartment().getId());
        }
        return membershipRepository.findActiveUserIdsByClubId(channel.getClub().getId());
    }

    private static String fit(String text, int max) {
        return text.length() <= max ? text : text.substring(0, max - 1) + "…";
    }
}
