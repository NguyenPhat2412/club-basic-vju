package com.vju.club.repository;

import com.vju.club.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    @EntityGraph(attributePaths = {"channel", "sender", "replyTo", "replyTo.sender", "document", "pinnedBy"})
    Page<ChatMessage> findByChannel_IdOrderByCreatedAtDesc(UUID channelId, Pageable pageable);

    @EntityGraph(attributePaths = {"channel", "sender", "replyTo", "replyTo.sender", "document", "pinnedBy"})
    List<ChatMessage> findByChannel_IdOrderByCreatedAtDesc(UUID channelId);

    @EntityGraph(attributePaths = {"channel", "sender", "replyTo", "replyTo.sender", "document", "pinnedBy"})
    Optional<ChatMessage> findWithRelationsById(UUID id);

    @EntityGraph(attributePaths = {"channel", "sender", "replyTo", "replyTo.sender", "document", "pinnedBy"})
    @Query("""
            SELECT m FROM ChatMessage m
            WHERE m.channel.id = :channelId
              AND m.pinned = true
            ORDER BY m.pinnedAt DESC, m.createdAt DESC, m.id DESC
            """)
    List<ChatMessage> findPinnedByChannelId(@Param("channelId") UUID channelId);

    long countByChannel_Id(UUID channelId);

    @EntityGraph(attributePaths = {"channel", "sender", "replyTo", "replyTo.sender", "document", "pinnedBy"})
    @Query("""
            SELECT m FROM ChatMessage m
            WHERE m.channel.id = :channelId
              AND (m.createdAt < :cursorAt OR (m.createdAt = :cursorAt AND m.id < :cursorId))
            ORDER BY m.createdAt DESC, m.id DESC
            """)
    List<ChatMessage> findBeforeCursor(@Param("channelId") UUID channelId,
                                       @Param("cursorAt") OffsetDateTime cursorAt,
                                       @Param("cursorId") UUID cursorId,
                                       Pageable pageable);

    @Query(value = """
            SELECT m.channel_id AS channelId,
                   MAX(m.created_at) AS lastMessageAt,
                   COUNT(*) FILTER (
                       WHERE (r.last_read_at IS NULL OR m.created_at > r.last_read_at)
                         AND (m.sender_id IS NULL OR m.sender_id <> :userId)
                   ) AS unreadCount
            FROM chat_messages m
            LEFT JOIN chat_channel_reads r ON r.channel_id = m.channel_id AND r.user_id = :userId
            WHERE m.channel_id IN (:channelIds)
            GROUP BY m.channel_id
            """, nativeQuery = true)
    List<ChannelActivityRow> summarizeActivity(@Param("channelIds") Collection<UUID> channelIds,
                                               @Param("userId") UUID userId);

    interface ChannelActivityRow {
        UUID getChannelId();
        Instant getLastMessageAt();
        long getUnreadCount();
    }
}
