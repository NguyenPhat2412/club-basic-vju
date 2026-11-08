package com.vju.club.entity;

import lombok.Setter;
import lombok.Getter;
import com.vju.club.enums.UserStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
public class User extends TimestampedEntity {
    @Column(nullable = false, length = 320)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Column(name = "student_code", length = 50)
    private String studentCode;

    @Column(length = 32)
    private String phone;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "requires_password_change", nullable = false)
    private boolean requiresPasswordChange;

    @Column(name = "google_subject")
    private String googleSubject;

    @Column(name = "anonymized_at")
    private OffsetDateTime anonymizedAt;
}
