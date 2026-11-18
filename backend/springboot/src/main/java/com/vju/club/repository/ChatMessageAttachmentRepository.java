package com.vju.club.repository;

import com.vju.club.entity.ChatMessageAttachment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatMessageAttachmentRepository extends JpaRepository<ChatMessageAttachment, UUID> {
    List<ChatMessageAttachment> findByMessage_IdInOrderBySortOrderAscCreatedAtAsc(Collection<UUID> messageIds);

    @EntityGraph(attributePaths = {"channel", "channel.club", "channel.department"})
    Optional<ChatMessageAttachment> findWithChannelById(UUID id);

    @EntityGraph(attributePaths = {"channel", "uploader", "message"})
    List<ChatMessageAttachment> findByIdIn(Collection<UUID> ids);

    List<ChatMessageAttachment> findByMessage_Id(UUID messageId);

    List<ChatMessageAttachment> findByChannel_Id(UUID channelId);
}
