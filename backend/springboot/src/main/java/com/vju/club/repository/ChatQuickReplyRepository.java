package com.vju.club.repository;

import com.vju.club.entity.ChatQuickReply;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatQuickReplyRepository extends JpaRepository<ChatQuickReply, UUID> {
    @EntityGraph(attributePaths = {"creator"})
    List<ChatQuickReply> findByClub_IdOrderBySortOrderAscCreatedAtAsc(UUID clubId);

    @EntityGraph(attributePaths = {"club", "creator"})
    Optional<ChatQuickReply> findWithRelationsById(UUID id);

    boolean existsByClub_IdAndShortcutIgnoreCase(UUID clubId, String shortcut);

    boolean existsByClub_IdAndShortcutIgnoreCaseAndIdNot(UUID clubId, String shortcut, UUID id);

    long countByClub_Id(UUID clubId);
}
