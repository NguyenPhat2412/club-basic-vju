package com.vju.club.service;

/**
 * Publishes STOMP WebSocket broadcasts to topic and user-queue destinations.
 * Implementations either deliver directly to the local broker or fan out across
 * backend instances via Redis Pub/Sub when Redis is enabled.
 */
public interface RealtimeMessagePublisher {
    void convertAndSend(String destination, Object payload);

    void convertAndSendToUser(String user, String destination, Object payload);
}
