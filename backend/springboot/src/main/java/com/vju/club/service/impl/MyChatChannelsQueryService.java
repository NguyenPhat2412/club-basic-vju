package com.vju.club.service.impl;

import com.vju.club.common.ChatConstants;
import com.vju.club.dto.response.MyChatChannelResponse;
import com.vju.club.entity.ChatChannel;
import com.vju.club.entity.Club;
import com.vju.club.enums.ClubStatus;
import com.vju.club.repository.ChatChannelRepository;
import com.vju.club.repository.ChatMessageRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MyChatChannelsQueryService {
    private final ChatChannelRepository channelRepository;
    private final ChatMessageRepository messageRepository;
    private final ClubRepository clubRepository;
    private final MembershipRepository membershipRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final PermissionAuthorizationService authorizationService;

    @Transactional(readOnly = true)
    public List<MyChatChannelResponse> listMyChannels(Actor actor) {
        boolean globalView = authorizationService.hasGlobalPermission(actor, ChatConstants.PERMISSION_VIEW);
        Set<UUID> permittedClubIds = globalView
                ? Set.copyOf(clubRepository.findActiveIds())
                : authorizationService.getPermittedClubIds(actor, ChatConstants.PERMISSION_VIEW);
        Map<UUID, UUID> permittedDeptToClub = globalView
                ? Map.of()
                : authorizationService.getPermittedDepartments(actor, ChatConstants.PERMISSION_VIEW);
        Set<UUID> memberClubIds = globalView
                ? Set.of()
                : Set.copyOf(membershipRepository.findActiveClubIdsByUserId(actor.id()));

        LinkedHashSet<UUID> candidateClubIds = new LinkedHashSet<>();
        candidateClubIds.addAll(permittedClubIds);
        candidateClubIds.addAll(memberClubIds);
        candidateClubIds.addAll(permittedDeptToClub.values());
        if (candidateClubIds.isEmpty()) {
            return List.of();
        }

        Set<UUID> myDeptIds = globalView
                ? Set.of()
                : Set.copyOf(departmentMemberRepository.findActiveDepartmentIdsByUserId(actor.id()));

        List<ChatChannel> visible = channelRepository.findByClub_IdInOrderByCreatedAtAsc(candidateClubIds).stream()
                .filter(ch -> ch.getClub() != null && ch.getClub().getStatus() == ClubStatus.ACTIVE)
                .filter(ch -> {
                    UUID cId = ch.getClub().getId();
                    boolean clubWide = globalView || permittedClubIds.contains(cId);
                    if (ch.getDepartment() == null) {
                        return clubWide || memberClubIds.contains(cId);
                    }
                    UUID dId = ch.getDepartment().getId();
                    return clubWide || myDeptIds.contains(dId) || permittedDeptToClub.containsKey(dId);
                })
                .toList();
        if (visible.isEmpty()) {
            return List.of();
        }

        List<UUID> ids = visible.stream().map(ChatChannel::getId).toList();
        Map<UUID, ChatMessageRepository.ChannelActivityRow> activity = messageRepository
                .summarizeActivity(ids, actor.id())
                .stream()
                .collect(Collectors.toMap(ChatMessageRepository.ChannelActivityRow::getChannelId, Function.identity()));
        Map<UUID, ChatMessageRepository.ChannelLatestMessageRow> latestMap = messageRepository
                .findLatestMessages(ids)
                .stream()
                .collect(Collectors.toMap(ChatMessageRepository.ChannelLatestMessageRow::getChannelId, Function.identity()));

        return visible.stream()
                .map(ch -> toResponse(ch, activity.get(ch.getId()), latestMap.get(ch.getId())))
                .sorted(Comparator
                        .comparing((MyChatChannelResponse r) -> r.lastMessageAt() != null ? r.lastMessageAt() : r.createdAt(),
                                Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(MyChatChannelResponse::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private MyChatChannelResponse toResponse(ChatChannel ch,
                                             ChatMessageRepository.ChannelActivityRow row,
                                             ChatMessageRepository.ChannelLatestMessageRow latest) {
        long unread = row != null ? row.getUnreadCount() : 0L;
        OffsetDateTime lastAt = row != null && row.getLastMessageAt() != null
                ? row.getLastMessageAt().atOffset(ZoneOffset.UTC)
                : null;
        String preview = null;
        String senderName = null;
        if (latest != null) {
            String raw = latest.getContent() == null ? "" : latest.getContent().strip();
            preview = raw.isEmpty()
                    ? "[Đính kèm đa phương tiện]"
                    : raw.length() <= 120 ? raw : raw.substring(0, 119) + "…";
            senderName = "AI_BOT".equals(latest.getSenderType())
                    ? "Trợ lý AI CLB"
                    : latest.getSenderName();
        }
        Club club = ch.getClub();
        return new MyChatChannelResponse(
                ch.getId(),
                club.getId(),
                club.getCode(),
                club.getName(),
                club.getLogoUrl(),
                ch.getDepartment() != null ? ch.getDepartment().getId() : null,
                ch.getDepartment() != null ? ch.getDepartment().getName() : null,
                ch.getEvent() != null ? ch.getEvent().getId() : null,
                ch.getEvent() != null ? ch.getEvent().getTitle() : null,
                ch.getName(),
                ch.getChannelType().name(),
                unread,
                lastAt,
                preview,
                senderName,
                ch.getCreatedAt(),
                ch.getUpdatedAt()
        );
    }
}
