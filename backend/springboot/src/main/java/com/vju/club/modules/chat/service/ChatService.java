package com.vju.club.modules.chat.service;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.chat.dto.request.CreateChatChannelRequest;
import com.vju.club.modules.chat.dto.request.SendChatMessageRequest;
import com.vju.club.modules.chat.dto.request.SummarizeChatRequest;
import com.vju.club.modules.chat.dto.response.AiSummaryResponse;
import com.vju.club.modules.chat.dto.response.ChatChannelResponse;
import com.vju.club.modules.chat.dto.response.ChatMessageResponse;
import com.vju.club.security.Actor;

import java.util.List;
import java.util.UUID;

public interface ChatService {
    ChatChannelResponse createChannel(Actor actor, UUID clubId, CreateChatChannelRequest request);

    List<ChatChannelResponse> listChannels(Actor actor, UUID clubId);

    ChatMessageResponse sendMessage(Actor actor, UUID channelId, SendChatMessageRequest request);

    PageResponse<ChatMessageResponse> listMessages(Actor actor, UUID channelId, int offset, int limit);

    AiSummaryResponse summarizeChannel(Actor actor, UUID channelId, SummarizeChatRequest request);

    List<AiSummaryResponse> listSummaries(Actor actor, UUID channelId);
}
