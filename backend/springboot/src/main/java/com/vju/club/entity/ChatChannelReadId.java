package com.vju.club.entity;

import java.io.Serializable;
import java.util.UUID;

public record ChatChannelReadId(UUID channelId, UUID userId) implements Serializable {
    public ChatChannelReadId() {
        this(null, null);
    }
}
