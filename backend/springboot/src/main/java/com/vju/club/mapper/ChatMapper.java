package com.vju.club.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.dto.record.ChatChannelRecord;
import com.vju.club.dto.response.AiSummaryResponse;
import com.vju.club.dto.response.ChatChannelResponse;
import com.vju.club.dto.response.ChatMessageResponse;
import com.vju.club.entity.AiSummary;
import com.vju.club.entity.ChatChannel;
import com.vju.club.entity.ChatMessage;
import com.vju.club.entity.Document;
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
    @Mapping(target = "unreadCount", constant = "0L")
    @Mapping(target = "lastMessageAt", ignore = true)
    ChatChannelResponse toChannelResponse(ChatChannel channel);

    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "eventId", source = "event.id")
    ChatChannelRecord toRecord(ChatChannel channel);

    @Mapping(target = "channelId", source = "channel.id")
    @Mapping(target = "senderId", source = "sender.id")
    @Mapping(target = "senderFullName", source = "sender.fullName")
    @Mapping(target = "senderAvatarUrl", source = "sender.avatarUrl")
    @Mapping(target = "replyToId", source = "replyTo.id")
    @Mapping(target = "replyToSenderName", source = "replyTo.sender.fullName")
    @Mapping(target = "replyToPreview", expression = "java(snippetOf(message.getReplyTo()))")
    @Mapping(target = "documentId", expression = "java(liveDocId(message.getDocument()))")
    @Mapping(target = "documentName", expression = "java(liveDocName(message.getDocument()))")
    @Mapping(target = "documentContentType", expression = "java(liveDocType(message.getDocument()))")
    @Mapping(target = "documentSizeBytes", expression = "java(liveDocSize(message.getDocument()))")
    @Mapping(target = "documentPreviewable", expression = "java(liveDocPreviewable(message.getDocument()))")
    @Mapping(target = "attachments", expression = "java(java.util.List.of())")
    @Mapping(target = "reactions", expression = "java(java.util.List.of())")
    @Mapping(target = "pinnedByName", source = "pinnedBy.fullName")
    @Mapping(target = "deliveryStatus", expression = "java(message.getDeliveryStatus() != null ? message.getDeliveryStatus().name() : \"SENT\")")
    @Mapping(target = "seenCount", constant = "0")
    @Mapping(target = "seenByNames", expression = "java(java.util.List.of())")
    @Mapping(target = "lastSeenAt", ignore = true)
    @Mapping(target = "clientTempId", ignore = true)
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

    default String snippetOf(ChatMessage replyTo) {
        if (replyTo == null) return null;
        String text = replyTo.getContent() == null ? "" : replyTo.getContent().strip();
        if (text.isEmpty()) return "[Đính kèm đa phương tiện]";
        return text.length() <= 100 ? text : text.substring(0, 99) + "…";
    }

    default java.util.UUID liveDocId(Document doc) {
        return doc != null && !doc.isDeleted() ? doc.getId() : null;
    }

    default String liveDocName(Document doc) {
        return doc != null && !doc.isDeleted() ? doc.getName() : null;
    }

    default String liveDocType(Document doc) {
        return doc != null && !doc.isDeleted() ? doc.getContentType() : null;
    }

    default Long liveDocSize(Document doc) {
        return doc != null && !doc.isDeleted() ? doc.getSizeBytes() : null;
    }

    default Boolean liveDocPreviewable(Document doc) {
        if (doc == null || doc.isDeleted() || doc.getContentType() == null) return null;
        String ct = doc.getContentType();
        return ct.equals("application/pdf") || ct.startsWith("image/") || ct.startsWith("text/");
    }
}
