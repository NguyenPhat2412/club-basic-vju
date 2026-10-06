package com.vju.club.modules.club.entity;

import com.vju.club.common.entity.TimestampedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "clubs")
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

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getActivityField() { return activityField; }
    public void setActivityField(String activityField) { this.activityField = activityField; }
    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }
    public ClubStatus getStatus() { return status; }
    public void setStatus(ClubStatus status) { this.status = status; }
}
