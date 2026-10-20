package com.vju.club.modules.chat.repository;

import com.vju.club.modules.chat.entity.ChatChannel;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatChannelRepository extends JpaRepository<ChatChannel, UUID> {
    @EntityGraph(attributePaths = {"club", "department", "event"})
    Optional<ChatChannel> findWithRelationsById(UUID id);

    @EntityGraph(attributePaths = {"club", "department", "event"})
    List<ChatChannel> findByClub_IdOrderByCreatedAtAsc(UUID clubId);
}
