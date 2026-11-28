package com.vju.club.repository;

import com.vju.club.entity.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, UUID> {
    List<DocumentVersion> findByDocument_IdOrderByVersionDesc(UUID documentId);

    Optional<DocumentVersion> findByDocument_IdAndVersion(UUID documentId, int version);

    @Query("SELECT COALESCE(SUM(v.sizeBytes), 0) FROM DocumentVersion v WHERE v.document.club.id = :clubId AND v.document.deleted = false")
    long sumLiveSizeBytesByClubId(@Param("clubId") UUID clubId);

    @Query("SELECT COALESCE(SUM(v.sizeBytes), 0) FROM DocumentVersion v WHERE v.document.id = :documentId")
    long sumSizeBytesByDocumentId(@Param("documentId") UUID documentId);

    @Query("SELECT COALESCE(SUM(v.sizeBytes), 0) FROM DocumentVersion v WHERE v.document.deleted = false")
    long sumAllLiveSizeBytes();
}
