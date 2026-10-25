package com.vju.club.modules.chat.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.modules.chat.dto.record.ChatChannelRecord;
import com.vju.club.modules.chat.dto.response.AiSummaryResponse;
import com.vju.club.modules.chat.dto.response.ChatChannelResponse;
import com.vju.club.modules.chat.dto.response.ChatMessageResponse;
import com.vju.club.modules.chat.entity.AiSummary;
import com.vju.club.modules.chat.entity.ChatChannel;
import com.vju.club.modules.chat.entity.ChatMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.Collections;
import java.util.List;

@Mapper
public interface ChatMapper {
    ObjectMapper JSON = new ObjectMapper();

    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "departmentName", source = "department.name")
    @Mapping(target = "eventId", source = "event.id")
    @Mapping(target = "eventTitle", source = "event.title")
    ChatChannelResponse toChannelResponse(ChatChannel channel);

    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "eventId", source = "event.id")
    ChatChannelRecord toRecord(ChatChannel channel);

    @Mapping(target = "channelId", source = "channel.id")
    @Mapping(target = "senderId", source = "sender.id")
    @Mapping(target = "senderFullName", source = "sender.fullName")
    ChatMessageResponse toMessageResponse(ChatMessage message);

    @Mapping(target = "channelId", source = "channel.id")
    @Mapping(target = "requestedBy", source = "requestedBy.id")
    @Mapping(target = "decisions", source = "decisionsJson", qualifiedByName = "jsonToStringList")
    @Mapping(target = "suggestedTasks", source = "suggestedTasksJson", qualifiedByName = "jsonToStringList")
    @Mapping(target = "suggestedEvents", source = "suggestedEventsJson", qualifiedByName = "jsonToStringList")
    AiSummaryResponse toSummaryResponse(AiSummary summary);

    @Named("jsonToStringList")
    default List<String> jsonToStringList(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return JSON.readValue(json, new TypeReference<>() { });
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
