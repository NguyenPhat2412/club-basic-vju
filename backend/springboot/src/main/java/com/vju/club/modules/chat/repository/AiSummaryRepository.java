package com.vju.club.modules.chat.repository;

import com.vju.club.modules.chat.entity.AiSummary;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AiSummaryRepository extends JpaRepository<AiSummary, UUID> {
    @EntityGraph(attributePaths = {"channel", "requestedBy"})
    List<AiSummary> findByChannel_IdOrderByCreatedAtDesc(UUID channelId);

    long countByRequestedBy_IdAndCreatedAtAfter(UUID userId, java.time.OffsetDateTime after);
}
