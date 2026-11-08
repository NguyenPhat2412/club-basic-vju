package com.vju.club.entity;

import lombok.Setter;
import lombok.Getter;
import com.vju.club.enums.ClubStatus;

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

    @Column(name = "logo_storage_key", length = 500)
    private String logoStorageKey;

    @Column(name = "logo_content_type", length = 100)
    private String logoContentType;

    @Column(name = "logo_size_bytes")
    private Long logoSizeBytes;

    @Column(name = "cover_url")
    private String coverUrl;

    @Column(name = "cover_storage_key", length = 500)
    private String coverStorageKey;

    @Column(name = "cover_content_type", length = 100)
    private String coverContentType;

    @Column(name = "cover_size_bytes")
    private Long coverSizeBytes;

    private String description;

    @Column(name = "activity_field", length = 200)
    private String activityField;

    @Column(name = "contact_email", length = 320)
    private String contactEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ClubStatus status = ClubStatus.ACTIVE;
}
