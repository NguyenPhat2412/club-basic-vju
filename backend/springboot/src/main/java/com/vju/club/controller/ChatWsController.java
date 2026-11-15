package com.vju.club.controller;

import com.vju.club.security.websocket.ActorPrincipal;
import com.vju.club.service.impl.ChatRealtimeBroker;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class ChatWsController {
    private final ChatRealtimeBroker realtimeBroker;

    @MessageMapping("/channels.{channelId}.typing")
    public void typing(@DestinationVariable UUID channelId, Principal principal) {
        if (principal instanceof ActorPrincipal actorPrincipal) {
            realtimeBroker.publishTyping(channelId, actorPrincipal);
        }
    }
}
