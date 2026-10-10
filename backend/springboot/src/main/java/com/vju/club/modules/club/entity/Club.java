package com.vju.club.modules.club.entity;

import lombok.Setter;
import lombok.Getter;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.common.entity.TimestampedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "clubs")
@Getter
@Setter
public class Club extends TimestampedEntity {
    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "cover_url")
    private String coverUrl;

    private String description;

    @Column(name = "activity_field", length = 200)
    private String activityField;

    @Column(name = "contact_email", length = 320)
    private String contactEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ClubStatus status = ClubStatus.ACTIVE;
}
