package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        UUID channelId,
        UUID senderId,
        String senderFullName,
        String senderType,
        String content,
        UUID replyToId,
        String replyToSenderName,
        String replyToPreview,
        UUID documentId,
        String documentName,
        String documentContentType,
        Long documentSizeBytes,
        Boolean documentPreviewable,
        List<ChatAttachmentResponse> attachments,
        String clientTempId,
        OffsetDateTime createdAt
) {
    public ChatMessageResponse withAttachments(List<ChatAttachmentResponse> items, String tempId) {
        return new ChatMessageResponse(
                id,
                channelId,
                senderId,
                senderFullName,
                senderType,
                content,
                replyToId,
                replyToSenderName,
                replyToPreview,
                documentId,
                documentName,
                documentContentType,
                documentSizeBytes,
                documentPreviewable,
                items == null ? List.of() : items,
                tempId,
                createdAt
        );
    }
}
