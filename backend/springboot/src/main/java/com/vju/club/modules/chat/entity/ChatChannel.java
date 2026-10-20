package com.vju.club.modules.chat.entity;

import com.vju.club.common.entity.TimestampedEntity;
import com.vju.club.modules.chat.enums.ChatChannelType;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.event.entity.Event;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "chat_channels")
@Getter
@Setter
public class ChatChannel extends TimestampedEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false, updatable = false)
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;

    @Column(nullable = false, length = 160)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel_type", nullable = false, length = 32)
    private ChatChannelType channelType = ChatChannelType.CLUB_GENERAL;
}
