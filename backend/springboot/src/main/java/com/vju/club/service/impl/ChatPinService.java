package com.vju.club.service.impl;

import com.vju.club.common.ChatConstants;
import com.vju.club.dto.response.ChatMessageResponse;
import com.vju.club.dto.response.ChatRealtimeEvent;
import com.vju.club.entity.ChatChannel;
import com.vju.club.entity.ChatMessage;
import com.vju.club.entity.User;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.ChatMapper;
import com.vju.club.repository.ChatMessageRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatPinService {
    private static final int MAX_PINNED_PER_CHANNEL = 10;

    private final ChatAccessPolicy chatAccessPolicy;
    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final ChatMediaService chatMediaService;
    private final ChatMapper chatMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> listPinnedMessages(Actor actor, UUID channelId) {
        chatAccessPolicy.requireChannelAccessById(actor, channelId, ChatConstants.PERMISSION_VIEW, false);
        List<ChatMessageResponse> raw = messageRepository.findPinnedByChannelId(channelId).stream()
                .limit(MAX_PINNED_PER_CHANNEL)
                .map(chatMapper::toMessageResponse)
                .toList();
        return chatMediaService.enrichMessages(raw);
    }

    @Transactional
    public ChatMessageResponse pinMessage(Actor actor, UUID channelId, UUID messageId) {
        ChatChannel channel = chatAccessPolicy.requireChannelAccessById(actor, channelId, ChatConstants.PERMISSION_SEND, true);
        User pinner = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        ChatMessage target = messageRepository.findWithRelationsById(messageId)
                .filter(m -> m.getChannel().getId().equals(channelId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MESSAGE_NOT_FOUND", "Message not found in channel"));

        OffsetDateTime now = OffsetDateTime.now(clock);
        if (!target.isPinned()) {
            List<ChatMessage> existing = messageRepository.findPinnedByChannelId(channelId);
            if (existing.size() >= MAX_PINNED_PER_CHANNEL) {
                for (int i = MAX_PINNED_PER_CHANNEL - 1; i < existing.size(); i++) {
                    ChatMessage oldest = existing.get(i);
                    oldest.setPinned(false);
                    oldest.setPinnedAt(null);
                    oldest.setPinnedBy(null);
                    ChatMessage savedOldest = messageRepository.save(oldest);
                    ChatMessageResponse unpinnedResp = enrichSingle(savedOldest);
                    eventPublisher.publishEvent(new ChatRealtimeEvent(
                            "MESSAGE_UNPINNED", channel.getClub().getId(), channelId,
                            actor.id(), pinner.getFullName(), unpinnedResp, null,
                            channelRecipients(channel), now
                    ));
                }
            }
        }

        target.setPinned(true);
        target.setPinnedAt(now);
        target.setPinnedBy(pinner);
        ChatMessage saved = messageRepository.saveAndFlush(target);
        ChatMessageResponse response = enrichSingle(saved);

        eventPublisher.publishEvent(new ChatRealtimeEvent(
                "MESSAGE_PINNED", channel.getClub().getId(), channelId,
                actor.id(), pinner.getFullName(), response, null,
                channelRecipients(channel), now
        ));
        return response;
    }

    @Transactional
    public ChatMessageResponse unpinMessage(Actor actor, UUID channelId, UUID messageId) {
        ChatChannel channel = chatAccessPolicy.requireChannelAccessById(actor, channelId, ChatConstants.PERMISSION_SEND, true);
        User actorUser = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        ChatMessage target = messageRepository.findWithRelationsById(messageId)
                .filter(m -> m.getChannel().getId().equals(channelId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MESSAGE_NOT_FOUND", "Message not found in channel"));

        target.setPinned(false);
        target.setPinnedAt(null);
        target.setPinnedBy(null);
        ChatMessage saved = messageRepository.saveAndFlush(target);
        ChatMessageResponse response = enrichSingle(saved);

        eventPublisher.publishEvent(new ChatRealtimeEvent(
                "MESSAGE_UNPINNED", channel.getClub().getId(), channelId,
                actor.id(), actorUser.getFullName(), response, null,
                channelRecipients(channel), OffsetDateTime.now(clock)
        ));
        return response;
    }

    private ChatMessageResponse enrichSingle(ChatMessage message) {
        List<ChatMessageResponse> enriched = chatMediaService.enrichMessages(List.of(chatMapper.toMessageResponse(message)));
        return enriched.getFirst();
    }

    private List<UUID> channelRecipients(ChatChannel channel) {
        if (channel.getDepartment() != null) {
            return departmentMemberRepository.findActiveUserIdsByDepartmentId(channel.getDepartment().getId());
        }
        return membershipRepository.findActiveUserIdsByClubId(channel.getClub().getId());
    }
}
