package com.vju.club.service.impl;

import com.vju.club.dto.response.ChatMessageResponse;
import com.vju.club.dto.response.ChatRealtimeEvent;
import com.vju.club.entity.ChatChannel;
import com.vju.club.entity.ChatMessage;
import com.vju.club.entity.User;
import com.vju.club.enums.ChatMessageStatus;
import com.vju.club.repository.ChatChannelReadRepository;
import com.vju.club.repository.ChatChannelRepository;
import com.vju.club.repository.ChatMessageRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.websocket.ActorPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatDeliveryReceiptService {
    private static final String CHANNEL_TOPIC_PREFIX = "/topic/channels.";
    private static final int MAX_SEEN_NAMES = 4;

    private final ChatChannelReadRepository channelReadRepository;
    private final ChatMessageRepository messageRepository;
    private final ChatChannelRepository channelRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    @Autowired(required = false)
    private SimpUserRegistry simpUserRegistry;

    public void initializeMessageDelivery(ChatMessage message, UUID senderId, Collection<UUID> recipients, OffsetDateTime now) {
        boolean anyOnlineRecipient = simpUserRegistry != null
                && recipients != null
                && recipients.stream().anyMatch(uid -> !uid.equals(senderId) && simpUserRegistry.getUser(uid.toString()) != null);
        if (anyOnlineRecipient) {
            message.setDeliveryStatus(ChatMessageStatus.DELIVERED);
            message.setDeliveredAt(now);
        } else {
            message.setDeliveryStatus(ChatMessageStatus.SENT);
        }
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> enrichReceipts(UUID channelId, List<ChatMessageResponse> items) {
        if (items == null || items.isEmpty()) return List.of();
        List<ChatChannelReadRepository.ChannelReaderRow> readers = channelReadRepository.findReadersByChannelId(channelId);
        if (readers.isEmpty()) return items;

        List<ChatMessageResponse> out = new ArrayList<>(items.size());
        for (ChatMessageResponse m : items) {
            int seenCount = 0;
            List<String> names = new ArrayList<>(MAX_SEEN_NAMES);
            OffsetDateTime lastSeenAt = null;
            for (var r : readers) {
                if (m.senderId() != null && m.senderId().equals(r.getUserId())) continue;
                if (r.getLastReadAt() == null) continue;
                OffsetDateTime readAt = r.getLastReadAt().atOffset(ZoneOffset.UTC);
                if (!readAt.isBefore(m.createdAt())) {
                    seenCount++;
                    if (names.size() < MAX_SEEN_NAMES && r.getFullName() != null && !r.getFullName().isBlank()) {
                        names.add(r.getFullName().strip());
                    }
                    if (lastSeenAt == null || readAt.isAfter(lastSeenAt)) {
                        lastSeenAt = readAt;
                    }
                }
            }
            String resolvedStatus = seenCount > 0 ? "SEEN" : m.deliveryStatus();
            OffsetDateTime resolvedDeliveredAt = m.deliveredAt() != null
                    ? m.deliveredAt()
                    : (seenCount > 0 ? lastSeenAt : null);
            out.add(ChatMessageResponse.enrichReceipt(
                    m, resolvedStatus, resolvedDeliveredAt, seenCount, List.copyOf(names), lastSeenAt));
        }
        return out;
    }

    @Transactional
    public void markChannelReadAndBroadcast(ChatChannel channel, UUID actorId, UUID lastReadMessageId,
                                            OffsetDateTime readAt, List<UUID> recipients) {
        channelReadRepository.upsertRead(channel.getId(), actorId, lastReadMessageId, readAt);
        messageRepository.markChannelMessagesSeenUpTo(channel.getId(), actorId, readAt);
        String readerName = userRepository.findById(actorId).map(User::getFullName).orElse("Thành viên");
        eventPublisher.publishEvent(new ChatRealtimeEvent(
                "CHANNEL_READ",
                channel.getClub().getId(),
                channel.getId(),
                actorId,
                readerName,
                null,
                null,
                recipients,
                readAt
        ));
    }

    @EventListener
    @Transactional
    public void onChannelSubscribe(SessionSubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith(CHANNEL_TOPIC_PREFIX)) return;
        if (!(accessor.getUser() instanceof ActorPrincipal principal)) return;

        UUID channelId;
        try {
            channelId = UUID.fromString(destination.substring(CHANNEL_TOPIC_PREFIX.length()).strip());
        } catch (IllegalArgumentException ex) {
            return;
        }

        OffsetDateTime now = OffsetDateTime.now(clock);
        int updated = messageRepository.markPendingChannelMessagesDelivered(channelId, principal.userId(), now);
        if (updated > 0) {
            UUID clubId = channelRepository.findById(channelId).map(ch -> ch.getClub().getId()).orElse(null);
            eventPublisher.publishEvent(new ChatRealtimeEvent(
                    "CHANNEL_DELIVERED",
                    clubId,
                    channelId,
                    principal.userId(),
                    principal.fullName(),
                    null,
                    null,
                    List.of(),
                    now
            ));
        }
    }
}
