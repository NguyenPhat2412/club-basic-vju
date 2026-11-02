package com.vju.club.repository;

import com.vju.club.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    @EntityGraph(attributePaths = {"channel", "sender"})
    Page<ChatMessage> findByChannel_IdOrderByCreatedAtDesc(UUID channelId, Pageable pageable);

    @EntityGraph(attributePaths = {"channel", "sender"})
    List<ChatMessage> findByChannel_IdOrderByCreatedAtDesc(UUID channelId);
}
