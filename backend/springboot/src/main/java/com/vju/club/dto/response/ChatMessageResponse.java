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
        boolean pinned,
        OffsetDateTime pinnedAt,
        String pinnedByName,
        String deliveryStatus,
        OffsetDateTime deliveredAt,
        int seenCount,
        List<String> seenByNames,
        OffsetDateTime lastSeenAt,
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
                pinned,
                pinnedAt,
                pinnedByName,
                deliveryStatus != null ? deliveryStatus : "SENT",
                deliveredAt,
                seenCount,
                seenByNames == null ? List.of() : seenByNames,
                lastSeenAt,
                tempId,
                createdAt
        );
    }

    public static ChatMessageResponse enrichReceipt(ChatMessageResponse base,
                                                    String resolvedStatus,
                                                    OffsetDateTime resolvedDeliveredAt,
                                                    int seenCount,
                                                    List<String> seenByNames,
                                                    OffsetDateTime lastSeenAt) {
        return new ChatMessageResponse(
                base.id(),
                base.channelId(),
                base.senderId(),
                base.senderFullName(),
                base.senderType(),
                base.content(),
                base.replyToId(),
                base.replyToSenderName(),
                base.replyToPreview(),
                base.documentId(),
                base.documentName(),
                base.documentContentType(),
                base.documentSizeBytes(),
                base.documentPreviewable(),
                base.attachments() == null ? List.of() : base.attachments(),
                base.pinned(),
                base.pinnedAt(),
                base.pinnedByName(),
                resolvedStatus != null ? resolvedStatus : "SENT",
                resolvedDeliveredAt,
                seenCount,
                seenByNames == null ? List.of() : seenByNames,
                lastSeenAt,
                base.clientTempId(),
                base.createdAt()
        );
    }
}
