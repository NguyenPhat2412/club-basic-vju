package com.vju.club.dto.request;

import java.util.UUID;

public record MarkChannelReadRequest(UUID lastReadMessageId) {
}
