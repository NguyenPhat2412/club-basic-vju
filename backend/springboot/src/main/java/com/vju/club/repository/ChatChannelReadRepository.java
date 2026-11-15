package com.vju.club.repository;

import com.vju.club.entity.ChatChannelRead;
import com.vju.club.entity.ChatChannelReadId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ChatChannelReadRepository extends JpaRepository<ChatChannelRead, ChatChannelReadId> {
    List<ChatChannelRead> findByUserIdAndChannelIdIn(UUID userId, Collection<UUID> channelIds);

    @Modifying(flushAutomatically = true)
    @Query(value = """
            INSERT INTO chat_channel_reads (channel_id, user_id, last_read_message_id, last_read_at)
            VALUES (:channelId, :userId, :lastMessageId, :readAt)
            ON CONFLICT (channel_id, user_id) DO UPDATE
            SET last_read_message_id = COALESCE(EXCLUDED.last_read_message_id, chat_channel_reads.last_read_message_id),
                last_read_at = GREATEST(chat_channel_reads.last_read_at, EXCLUDED.last_read_at)
            """, nativeQuery = true)
    void upsertRead(@Param("channelId") UUID channelId,
                    @Param("userId") UUID userId,
                    @Param("lastMessageId") UUID lastMessageId,
                    @Param("readAt") OffsetDateTime readAt);
}
