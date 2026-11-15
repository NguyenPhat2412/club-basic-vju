package com.vju.club.config;

import com.vju.club.common.ApiPaths;
import com.vju.club.security.websocket.ChatStompChannelInterceptor;
import com.vju.club.security.websocket.SessionHandshakeInterceptor;
import com.vju.club.security.websocket.WebSocketSessionTracker;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);

    private final SessionHandshakeInterceptor handshakeInterceptor;
    private final ChatStompChannelInterceptor channelInterceptor;
    private final WebSocketSessionTracker sessionTracker;
    private final String[] allowedOrigins;
    private final ThreadPoolTaskScheduler heartbeatScheduler;

    public WebSocketConfig(
            SessionHandshakeInterceptor handshakeInterceptor,
            ChatStompChannelInterceptor channelInterceptor,
            WebSocketSessionTracker sessionTracker,
            @Value("${app.cors.allowed-origins:http://localhost:3000}") List<String> allowedOrigins) {
        this.handshakeInterceptor = handshakeInterceptor;
        this.channelInterceptor = channelInterceptor;
        this.sessionTracker = sessionTracker;
        this.allowedOrigins = allowedOrigins.stream().map(String::strip).filter(s -> !s.isEmpty()).toArray(String[]::new);
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        scheduler.initialize();
        this.heartbeatScheduler = scheduler;
    }

    @PreDestroy
    void shutdownHeartbeatScheduler() {
        heartbeatScheduler.destroy();
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint(ApiPaths.WS_ENDPOINT)
                .setAllowedOrigins(allowedOrigins)
                .addInterceptors(handshakeInterceptor)
                .setHandshakeHandler(new DefaultHandshakeHandler() {
                    @Override
                    protected Principal determineUser(ServerHttpRequest request,
                                                      WebSocketHandler wsHandler,
                                                      Map<String, Object> attributes) {
                        Object stored = attributes.get(SessionHandshakeInterceptor.ATTR_PRINCIPAL);
                        return stored instanceof Principal principal ? principal : super.determineUser(request, wsHandler, attributes);
                    }
                });
        registry.setErrorHandler(new StompSubProtocolErrorHandler() {
            @Override
            public Message<byte[]> handleClientMessageProcessingError(Message<byte[]> clientMessage, Throwable ex) {
                String code = sanitizeErrorCode(ex);
                StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.ERROR);
                accessor.setMessage(code);
                accessor.setLeaveMutable(true);
                return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
            }
        });
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(64 * 1024)
                .setSendTimeLimit(15_000)
                .setSendBufferSizeLimit(512 * 1024)
                .addDecoratorFactory(sessionTracker);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{15_000, 15_000})
                .setTaskScheduler(heartbeatScheduler);
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(channelInterceptor);
    }

    private static String sanitizeErrorCode(Throwable ex) {
        for (Throwable cur = ex; cur != null; cur = cur.getCause()) {
            String msg = cur.getMessage();
            if (msg == null) continue;
            if (msg.startsWith("UNAUTHORIZED")) return "UNAUTHORIZED";
            if (msg.startsWith("PERMISSION_DENIED")) return "PERMISSION_DENIED";
            if (msg.startsWith("VALIDATION_ERROR")) return "VALIDATION_ERROR";
        }
        log.error("Unhandled STOMP processing error", ex);
        return "INTERNAL_ERROR";
    }
}
