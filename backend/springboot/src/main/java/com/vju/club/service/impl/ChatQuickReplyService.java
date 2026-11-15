package com.vju.club.service.impl;

import com.vju.club.common.ChatConstants;
import com.vju.club.dto.request.ChatQuickReplyRequest;
import com.vju.club.dto.response.ChatQuickReplyResponse;
import com.vju.club.entity.ChatQuickReply;
import com.vju.club.entity.Club;
import com.vju.club.entity.User;
import com.vju.club.enums.ClubStatus;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ChatQuickReplyRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatQuickReplyService {
    private static final int MAX_QUICK_REPLIES_PER_CLUB = 25;

    private final ChatQuickReplyRepository quickReplyRepository;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final PermissionAuthorizationService authorizationService;
    private final ChatAccessPolicy chatAccessPolicy;

    @Transactional(readOnly = true)
    public List<ChatQuickReplyResponse> listQuickReplies(Actor actor, UUID clubId) {
        Club club = requireClubView(actor, clubId);
        return quickReplyRepository.findByClub_IdOrderBySortOrderAscCreatedAtAsc(club.getId())
                .stream()
                .map(ChatQuickReplyResponse::from)
                .toList();
    }

    @Transactional
    public ChatQuickReplyResponse createQuickReply(Actor actor, UUID clubId, ChatQuickReplyRequest request) {
        Club club = requireClubSend(actor, clubId);
        if (quickReplyRepository.countByClub_Id(clubId) >= MAX_QUICK_REPLIES_PER_CLUB) {
            throw new ApiException(HttpStatus.CONFLICT, "DATA_CONFLICT",
                    "Each club can store at most " + MAX_QUICK_REPLIES_PER_CLUB + " quick replies");
        }
        String shortcut = normalizeShortcut(request.shortcut());
        if (quickReplyRepository.existsByClub_IdAndShortcutIgnoreCase(clubId, shortcut)) {
            throw new ApiException(HttpStatus.CONFLICT, "DATA_CONFLICT",
                    "Shortcut " + shortcut + " already exists in this club");
        }
        User creator = userRepository.findById(actor.id())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        ChatQuickReply entity = new ChatQuickReply();
        entity.setClub(club);
        entity.setCreator(creator);
        entity.setShortcut(shortcut);
        entity.setTitle(request.title().strip());
        entity.setContent(request.content().strip());
        entity.setSortOrder((int) quickReplyRepository.countByClub_Id(clubId) + 1);
        return ChatQuickReplyResponse.from(quickReplyRepository.save(entity));
    }

    @Transactional
    public ChatQuickReplyResponse updateQuickReply(Actor actor, UUID clubId, UUID replyId, ChatQuickReplyRequest request) {
        requireClubSend(actor, clubId);
        ChatQuickReply entity = loadOwnedOrOfficerReply(actor, clubId, replyId);
        String shortcut = normalizeShortcut(request.shortcut());
        if (quickReplyRepository.existsByClub_IdAndShortcutIgnoreCaseAndIdNot(clubId, shortcut, replyId)) {
            throw new ApiException(HttpStatus.CONFLICT, "DATA_CONFLICT",
                    "Shortcut " + shortcut + " already exists in this club");
        }
        entity.setShortcut(shortcut);
        entity.setTitle(request.title().strip());
        entity.setContent(request.content().strip());
        return ChatQuickReplyResponse.from(quickReplyRepository.save(entity));
    }

    @Transactional
    public void deleteQuickReply(Actor actor, UUID clubId, UUID replyId) {
        requireClubSend(actor, clubId);
        ChatQuickReply entity = loadOwnedOrOfficerReply(actor, clubId, replyId);
        quickReplyRepository.delete(entity);
    }

    private Club requireClubView(Actor actor, UUID clubId) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
        boolean officer = authorizationService.hasPermission(actor, ChatConstants.PERMISSION_VIEW, clubId, null);
        if (!officer && !chatAccessPolicy.isActiveMember(actor, clubId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        return club;
    }

    private Club requireClubSend(Actor actor, UUID clubId) {
        Club club = requireClubView(actor, clubId);
        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
        boolean canSend = authorizationService.hasPermission(actor, ChatConstants.PERMISSION_SEND, clubId, null)
                || chatAccessPolicy.isActiveMember(actor, clubId);
        if (!canSend) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
        return club;
    }

    private ChatQuickReply loadOwnedOrOfficerReply(Actor actor, UUID clubId, UUID replyId) {
        ChatQuickReply entity = quickReplyRepository.findWithRelationsById(replyId)
                .filter(r -> r.getClub().getId().equals(clubId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "VALIDATION_ERROR", "Quick reply not found"));
        boolean officer = authorizationService.hasPermission(actor, "club.update", clubId, null)
                || authorizationService.hasPermission(actor, ChatConstants.PERMISSION_SUMMARIZE, clubId, null);
        boolean isCreator = entity.getCreator() != null && entity.getCreator().getId().equals(actor.id());
        if (!officer && !isCreator) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED",
                    "Only club officers or the creator can modify this quick reply");
        }
        return entity;
    }

    static String normalizeShortcut(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Shortcut is required");
        }
        String ascii = Normalizer.normalize(raw.strip(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'd')
                .toLowerCase(Locale.ROOT);
        if (ascii.startsWith("/")) {
            ascii = ascii.substring(1);
        }
        ascii = ascii.replaceAll("[^a-z0-9_-]+", "-").replaceAll("^-+|-+$", "");
        if (ascii.isEmpty() || ascii.length() > 38) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid quick reply shortcut");
        }
        return "/" + ascii;
    }
}
