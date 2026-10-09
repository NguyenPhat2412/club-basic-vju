package com.vju.club.modules.user.entity;

import lombok.Setter;
import lombok.Getter;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.common.entity.TimestampedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

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
}
