package com.vju.club.dto.request;

import com.vju.club.enums.ChatChannelType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateChatChannelRequest(
        UUID departmentId,
        UUID eventId,
        @NotBlank @Size(max = 160) String name,
        ChatChannelType channelType
) {
}
