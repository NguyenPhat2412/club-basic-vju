package com.vju.club.modules.document.entity;

import com.vju.club.common.entity.CreatedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

import java.util.UUID;

@Entity
@Immutable
@Table(name = "document_versions")
@Getter
@Setter
public class DocumentVersion extends CreatedEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false, updatable = false)
    private Document document;

    @Column(nullable = false, updatable = false)
    private int version;

    @Column(nullable = false, updatable = false, length = 1024)
    private String path;

    @Column(name = "original_name", nullable = false, updatable = false, length = 255)
    private String originalName;

    @Column(name = "content_type", nullable = false, updatable = false, length = 127)
    private String contentType;

    @Column(name = "size_bytes", nullable = false, updatable = false)
    private long sizeBytes;

    @Column(name = "checksum_sha256", nullable = false, updatable = false, length = 64)
    private String checksumSha256;

    @Column(name = "uploaded_by", nullable = false, updatable = false)
    private UUID uploadedBy;
}
