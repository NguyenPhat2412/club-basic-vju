package com.vju.club.dto.response;

import com.vju.club.entity.ChatQuickReply;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ChatQuickReplyResponse(
        UUID id,
        UUID clubId,
        UUID createdBy,
        String creatorName,
        String shortcut,
        String title,
        String content,
        int sortOrder,
        OffsetDateTime updatedAt
) {
    public static ChatQuickReplyResponse from(ChatQuickReply qr) {
        return new ChatQuickReplyResponse(
                qr.getId(),
                qr.getClub().getId(),
                qr.getCreator() != null ? qr.getCreator().getId() : null,
                qr.getCreator() != null ? qr.getCreator().getFullName() : null,
                qr.getShortcut(),
                qr.getTitle(),
                qr.getContent(),
                qr.getSortOrder(),
                qr.getUpdatedAt()
        );
    }
}
