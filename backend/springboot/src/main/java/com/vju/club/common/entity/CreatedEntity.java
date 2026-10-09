package com.vju.club.common.entity;

import lombok.Setter;
import lombok.Getter;
import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@MappedSuperclass
@Getter
@Setter
public abstract class CreatedEntity extends BaseEntity {

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
