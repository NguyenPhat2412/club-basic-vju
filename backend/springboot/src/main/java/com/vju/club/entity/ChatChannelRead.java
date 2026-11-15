package com.vju.club.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_channel_reads")
@IdClass(ChatChannelReadId.class)
@Getter
@Setter
public class ChatChannelRead {
    @Id
    @Column(name = "channel_id", nullable = false)
    private UUID channelId;

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "last_read_message_id")
    private UUID lastReadMessageId;

    @Column(name = "last_read_at", nullable = false)
    private OffsetDateTime lastReadAt;
}
