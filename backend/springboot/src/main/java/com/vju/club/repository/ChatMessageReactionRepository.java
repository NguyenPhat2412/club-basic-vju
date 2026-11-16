package com.vju.club.repository;

import com.vju.club.entity.ChatMessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatMessageReactionRepository extends JpaRepository<ChatMessageReaction, UUID> {
    interface ReactionRow {
        UUID getMessageId();
        UUID getUserId();
        String getFullName();
        String getEmoji();
    }

    Optional<ChatMessageReaction> findByMessage_IdAndUser_IdAndEmoji(UUID messageId, UUID userId, String emoji);

    List<ChatMessageReaction> findByMessage_IdAndUser_IdOrderByCreatedAtAsc(UUID messageId, UUID userId);

    @Modifying
    @Query("DELETE FROM ChatMessageReaction r WHERE r.message.id = :messageId AND r.user.id = :userId AND r.emoji = :emoji")
    int deleteByMessageAndUserAndEmoji(@Param("messageId") UUID messageId,
                                       @Param("userId") UUID userId,
                                       @Param("emoji") String emoji);

    @Query(value = """
            SELECT r.message_id AS messageId,
                   r.user_id AS userId,
                   u.full_name AS fullName,
                   r.emoji AS emoji
            FROM chat_message_reactions r
            JOIN users u ON u.id = r.user_id
            WHERE r.message_id IN (:messageIds)
            ORDER BY r.created_at ASC
            """, nativeQuery = true)
    List<ReactionRow> findReactionRowsByMessageIds(@Param("messageIds") Collection<UUID> messageIds);
}
