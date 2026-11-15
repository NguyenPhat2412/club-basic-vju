package com.vju.club.dto.response;

import com.vju.club.entity.ChatMessageAttachment;

import java.util.UUID;

public record ChatAttachmentResponse(
        UUID id,
        UUID channelId,
        UUID messageId,
        String fileName,
        String contentType,
        String mediaKind,
        long sizeBytes,
        String checksumSha256,
        int sortOrder
) {
    public static ChatAttachmentResponse from(ChatMessageAttachment att) {
        return new ChatAttachmentResponse(
                att.getId(),
                att.getChannel().getId(),
                att.getMessage() != null ? att.getMessage().getId() : null,
                att.getFileName(),
                att.getContentType(),
                att.getMediaKind().name(),
                att.getSizeBytes(),
                att.getChecksumSha256(),
                att.getSortOrder()
        );
    }
}
