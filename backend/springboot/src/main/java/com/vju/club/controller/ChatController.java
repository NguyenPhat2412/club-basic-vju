package com.vju.club.controller;

import com.vju.club.common.ApiPaths;
import com.vju.club.dto.request.CreateChatChannelRequest;
import com.vju.club.dto.request.MarkChannelReadRequest;
import com.vju.club.dto.request.SendChatMessageRequest;
import com.vju.club.dto.request.SummarizeChatRequest;
import com.vju.club.dto.response.AiSummaryResponse;
import com.vju.club.dto.response.ChatChannelResponse;
import com.vju.club.dto.response.ChatMessageResponse;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.security.Actor;
import com.vju.club.service.ChatService;
import com.vju.club.service.impl.ChatPinService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
@Tag(name = "Chat & AI Assistant", description = "Kênh trao đổi nội bộ CLB/Ban/Sự kiện qua WebSocket STOMP thời gian thực, đính kèm tài liệu kho tập trung và AI Bot tóm tắt.")
public class ChatController {
    private final ChatService chatService;
    private final ChatPinService chatPinService;

    @PostMapping(ApiPaths.CLUB_CHANNELS)
    @Operation(summary = "Tạo kênh trao đổi nội bộ CLB, Ban hoặc Sự kiện")
    public ResponseEntity<ChatChannelResponse> createChannel(Actor actor,
                                                             @PathVariable UUID clubId,
                                                             @Valid @RequestBody CreateChatChannelRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatService.createChannel(actor, clubId, request));
    }

    @GetMapping(ApiPaths.CLUB_CHANNELS)
    @Operation(summary = "Danh sách các kênh chat của CLB kèm số tin chưa đọc (unreadCount)")
    public List<ChatChannelResponse> listChannels(Actor actor, @PathVariable UUID clubId) {
        return chatService.listChannels(actor, clubId);
    }

    @PostMapping(ApiPaths.CHANNEL_MESSAGES)
    @Operation(summary = "Gửi tin nhắn vào kênh chat (hỗ trợ replyToId, đính kèm documentId & đẩy WebSocket tức thì)")
    public ResponseEntity<ChatMessageResponse> sendMessage(Actor actor,
                                                           @PathVariable UUID channelId,
                                                           @Valid @RequestBody SendChatMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatService.sendMessage(actor, channelId, request));
    }

    @GetMapping(ApiPaths.CHANNEL_MESSAGES)
    @Operation(summary = "Lịch sử tin nhắn trong kênh chat (hỗ trợ cursor beforeId chống lệch trang hoặc offset/limit)")
    public PageResponse<ChatMessageResponse> listMessages(Actor actor,
                                                          @PathVariable UUID channelId,
                                                          @RequestParam(required = false) UUID beforeId,
                                                          @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                          @RequestParam(defaultValue = "50") @Min(1) @Max(100) int limit) {
        return chatService.listMessages(actor, channelId, beforeId, offset, limit);
    }

    @GetMapping(ApiPaths.CHANNEL_PINNED_MESSAGES)
    @Operation(summary = "Danh sách tin nhắn đã ghim trong kênh (kiểu Messenger)")
    public List<ChatMessageResponse> listPinnedMessages(Actor actor, @PathVariable UUID channelId) {
        return chatPinService.listPinnedMessages(actor, channelId);
    }

    @PostMapping(ApiPaths.CHANNEL_MESSAGE_PIN)
    @Operation(summary = "Ghim tin nhắn vào thanh ghim của kênh và phát realtime")
    public ResponseEntity<ChatMessageResponse> pinMessage(Actor actor,
                                                          @PathVariable UUID channelId,
                                                          @PathVariable UUID messageId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatPinService.pinMessage(actor, channelId, messageId));
    }

    @DeleteMapping(ApiPaths.CHANNEL_MESSAGE_PIN)
    @Operation(summary = "Bỏ ghim tin nhắn khỏi kênh và phát realtime")
    public ResponseEntity<Void> unpinMessage(Actor actor,
                                             @PathVariable UUID channelId,
                                             @PathVariable UUID messageId) {
        chatPinService.unpinMessage(actor, channelId, messageId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(ApiPaths.CHANNEL_READ)
    @Operation(summary = "Đánh dấu đã đọc tin nhắn trong kênh")
    public ResponseEntity<Void> markChannelRead(Actor actor,
                                                @PathVariable UUID channelId,
                                                @RequestBody(required = false) MarkChannelReadRequest request) {
        chatService.markChannelRead(actor, channelId, request != null ? request.lastReadMessageId() : null);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(ApiPaths.CHANNEL_SUMMARIES)
    @Operation(summary = "Yêu cầu AI Bot tóm tắt thảo luận và phát realtime vào kênh")
    public ResponseEntity<AiSummaryResponse> summarizeChannel(
            Actor actor,
            @PathVariable UUID channelId,
            @Valid @RequestBody(required = false) SummarizeChatRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatService.summarizeChannel(actor, channelId, request));
    }

    @GetMapping(ApiPaths.CHANNEL_SUMMARIES)
    @Operation(summary = "Lịch sử các bản tóm tắt AI của kênh chat")
    public List<AiSummaryResponse> listSummaries(Actor actor, @PathVariable UUID channelId) {
        return chatService.listSummaries(actor, channelId);
    }
}
