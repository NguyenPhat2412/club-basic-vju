package com.vju.club.modules.chat.dto.request;

import com.vju.club.modules.chat.enums.ChatChannelType;
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
