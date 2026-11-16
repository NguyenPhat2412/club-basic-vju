package com.vju.club.service.impl;

import com.vju.club.common.ChatConstants;
import com.vju.club.dto.request.ToggleChatReactionRequest;
import com.vju.club.dto.response.ChatMessageResponse;
import com.vju.club.dto.response.ChatReactionSummaryResponse;
import com.vju.club.dto.response.ChatRealtimeEvent;
import com.vju.club.entity.ChatChannel;
import com.vju.club.entity.ChatMessage;
import com.vju.club.entity.ChatMessageReaction;
import com.vju.club.entity.User;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.ChatMapper;
import com.vju.club.repository.ChatMessageReactionRepository;
import com.vju.club.repository.ChatMessageRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ChatReactionService {
    public static final int MAX_REACTIONS_PER_USER_PER_MESSAGE = 3;
    private static final int MAX_REACTOR_NAMES = 6;
    private static final Pattern DISALLOWED_EMOJI_CHARS = Pattern.compile("[\\p{Cntrl}\\p{IsAlphabetic}\\p{IsDigit}<>&\"'`]");

    private final ChatAccessPolicy chatAccessPolicy;
    private final ChatMessageRepository messageRepository;
    private final ChatMessageReactionRepository reactionRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final ChatMediaService chatMediaService;
    private final ChatMapper chatMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    @Autowired(required = false)
    private ChatDeliveryReceiptService deliveryReceiptService;

    @Transactional
    public ChatMessageResponse toggleReaction(Actor actor, UUID channelId, UUID messageId, ToggleChatReactionRequest request) {
        ChatChannel channel = chatAccessPolicy.requireChannelAccessById(actor, channelId, ChatConstants.PERMISSION_SEND, true);
        User actorUser = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        ChatMessage target = messageRepository.findWithRelationsById(messageId)
                .filter(m -> m.getChannel().getId().equals(channelId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MESSAGE_NOT_FOUND", "Message not found in channel"));

        String emoji = normalizeAndValidateEmoji(request != null ? request.emoji() : null);
        OffsetDateTime now = OffsetDateTime.now(clock);

        int deleted = reactionRepository.deleteByMessageAndUserAndEmoji(messageId, actor.id(), emoji);
        if (deleted == 0) {
            List<ChatMessageReaction> existingMine = reactionRepository
                    .findByMessage_IdAndUser_IdOrderByCreatedAtAsc(messageId, actor.id());
            if (existingMine.size() >= MAX_REACTIONS_PER_USER_PER_MESSAGE) {
                int removeCount = existingMine.size() - MAX_REACTIONS_PER_USER_PER_MESSAGE + 1;
                for (int i = 0; i < removeCount; i++) {
                    reactionRepository.delete(existingMine.get(i));
                }
                reactionRepository.flush();
            }
            ChatMessageReaction created = new ChatMessageReaction();
            created.setMessage(target);
            created.setUser(actorUser);
            created.setEmoji(emoji);
            created.setCreatedAt(now);
            reactionRepository.saveAndFlush(created);
        }

        ChatMessageResponse response = buildFullMessageResponse(channelId, target);
        Set<UUID> recipients = new LinkedHashSet<>(channelRecipients(channel));
        if (target.getSender() != null) {
            recipients.add(target.getSender().getId());
        }
        eventPublisher.publishEvent(new ChatRealtimeEvent(
                "MESSAGE_REACTION_UPDATED",
                channel.getClub().getId(),
                channelId,
                actor.id(),
                actorUser.getFullName(),
                response,
                null,
                List.copyOf(recipients),
                now
        ));
        return response;
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> enrichReactions(List<ChatMessageResponse> items) {
        if (items == null || items.isEmpty()) return List.of();
        List<UUID> messageIds = items.stream().map(ChatMessageResponse::id).toList();
        List<ChatMessageReactionRepository.ReactionRow> rows = reactionRepository.findReactionRowsByMessageIds(messageIds);
        if (rows.isEmpty()) return items;

        Map<UUID, Map<String, Bucket>> grouped = new LinkedHashMap<>();
        for (var row : rows) {
            Bucket bucket = grouped
                    .computeIfAbsent(row.getMessageId(), k -> new LinkedHashMap<>())
                    .computeIfAbsent(row.getEmoji(), Bucket::new);
            bucket.add(row.getUserId(), row.getFullName());
        }

        List<ChatMessageResponse> out = new ArrayList<>(items.size());
        for (ChatMessageResponse item : items) {
            Map<String, Bucket> perEmoji = grouped.get(item.id());
            if (perEmoji == null || perEmoji.isEmpty()) {
                out.add(item);
                continue;
            }
            List<ChatReactionSummaryResponse> summaries = perEmoji.values().stream()
                    .map(Bucket::toSummary)
                    .toList();
            out.add(ChatMessageResponse.enrichReactions(item, summaries));
        }
        return out;
    }

    public static String normalizeAndValidateEmoji(String raw) {
        if (raw == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Emoji reaction is required");
        }
        String clean = raw.strip();
        if (clean.isEmpty() || clean.length() > 24 || DISALLOWED_EMOJI_CHARS.matcher(clean).find()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid emoji reaction");
        }
        boolean hasPictogram = clean.codePoints().anyMatch(cp ->
                cp >= 0x203C || Character.getType(cp) == Character.OTHER_SYMBOL);
        if (!hasPictogram) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid emoji reaction");
        }
        return clean;
    }

    private ChatMessageResponse buildFullMessageResponse(UUID channelId, ChatMessage message) {
        List<ChatMessageResponse> list = chatMediaService.enrichMessages(List.of(chatMapper.toMessageResponse(message)));
        if (deliveryReceiptService != null) {
            list = deliveryReceiptService.enrichReceipts(channelId, list);
        }
        return enrichReactions(list).getFirst();
    }

    private List<UUID> channelRecipients(ChatChannel channel) {
        if (channel.getDepartment() != null) {
            return departmentMemberRepository.findActiveUserIdsByDepartmentId(channel.getDepartment().getId());
        }
        return membershipRepository.findActiveUserIdsByClubId(channel.getClub().getId());
    }

    private static final class Bucket {
        private final String emoji;
        private final Set<UUID> userIds = new LinkedHashSet<>();
        private final List<String> names = new ArrayList<>(MAX_REACTOR_NAMES);

        private Bucket(String emoji) {
            this.emoji = emoji;
        }

        private void add(UUID userId, String fullName) {
            if (userIds.add(userId) && names.size() < MAX_REACTOR_NAMES && fullName != null && !fullName.isBlank()) {
                names.add(fullName.strip());
            }
        }

        private ChatReactionSummaryResponse toSummary() {
            return new ChatReactionSummaryResponse(emoji, userIds.size(), List.copyOf(userIds), List.copyOf(names));
        }
    }
}
