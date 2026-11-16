package com.vju.club.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record SendChatMessageRequest(
        @Size(max = 4000) String content,
        UUID replyToId,
        UUID documentId,
        @Size(max = 8) List<@NotNull UUID> attachmentIds,
        @Size(max = 64) String clientTempId
) {
    public SendChatMessageRequest(String content) {
        this(content, null, null, null, null);
    }

    public SendChatMessageRequest(String content, UUID replyToId, UUID documentId) {
        this(content, replyToId, documentId, null, null);
    }
}
