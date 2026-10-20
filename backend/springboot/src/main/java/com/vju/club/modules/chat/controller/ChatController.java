package com.vju.club.modules.chat.controller;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.chat.dto.request.CreateChatChannelRequest;
import com.vju.club.modules.chat.dto.request.SendChatMessageRequest;
import com.vju.club.modules.chat.dto.request.SummarizeChatRequest;
import com.vju.club.modules.chat.dto.response.AiSummaryResponse;
import com.vju.club.modules.chat.dto.response.ChatChannelResponse;
import com.vju.club.modules.chat.dto.response.ChatMessageResponse;
import com.vju.club.modules.chat.service.ChatService;
import com.vju.club.security.Actor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Chat & AI Assistant", description = "Kênh trao đổi nội bộ CLB/Ban/Sự kiện và AI Bot (9router) tóm tắt thảo luận, quyết định, gợi ý công việc & lịch họp")
public class ChatController {
    private final ChatService chatService;

    @PostMapping("/clubs/{clubId}/channels")
    @Operation(summary = "Tạo kênh trao đổi nội bộ CLB, Ban hoặc Sự kiện")
    public ResponseEntity<ChatChannelResponse> createChannel(Actor actor,
                                                             @PathVariable UUID clubId,
                                                             @Valid @RequestBody CreateChatChannelRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatService.createChannel(actor, clubId, request));
    }

    @GetMapping("/clubs/{clubId}/channels")
    @Operation(summary = "Danh sách các kênh chat của CLB")
    public List<ChatChannelResponse> listChannels(Actor actor, @PathVariable UUID clubId) {
        return chatService.listChannels(actor, clubId);
    }

    @PostMapping("/channels/{channelId}/messages")
    @Operation(summary = "Gửi tin nhắn vào kênh chat")
    public ResponseEntity<ChatMessageResponse> sendMessage(Actor actor,
                                                           @PathVariable UUID channelId,
                                                           @Valid @RequestBody SendChatMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatService.sendMessage(actor, channelId, request));
    }

    @GetMapping("/channels/{channelId}/messages")
    @Operation(summary = "Lịch sử tin nhắn trong kênh chat (phân trang offset/limit)")
    public PageResponse<ChatMessageResponse> listMessages(Actor actor,
                                                          @PathVariable UUID channelId,
                                                          @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                          @RequestParam(defaultValue = "50") @Min(1) @Max(100) int limit) {
        return chatService.listMessages(actor, channelId, offset, limit);
    }

    @PostMapping("/channels/{channelId}/summaries")
    @Operation(summary = "Yêu cầu AI Bot (9router) tóm tắt thảo luận trong kênh",
            description = "Kết nối 9router (router.anhchau.all1.vn) hoặc fallback extractive để trích xuất summary, decisions, suggestedTasks, suggestedEvents và đăng bản tin AI_BOT vào kênh.")
    public ResponseEntity<AiSummaryResponse> summarizeChannel(
            Actor actor,
            @PathVariable UUID channelId,
            @Valid @RequestBody(required = false) SummarizeChatRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chatService.summarizeChannel(actor, channelId, request));
    }

    @GetMapping("/channels/{channelId}/summaries")
    @Operation(summary = "Lịch sử các bản tóm tắt AI của kênh chat")
    public List<AiSummaryResponse> listSummaries(Actor actor, @PathVariable UUID channelId) {
        return chatService.listSummaries(actor, channelId);
    }
}
