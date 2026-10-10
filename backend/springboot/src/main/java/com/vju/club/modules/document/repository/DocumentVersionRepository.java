package com.vju.club.modules.document.repository;

import com.vju.club.modules.document.entity.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, UUID> {
    List<DocumentVersion> findByDocument_IdOrderByVersionDesc(UUID documentId);

    Optional<DocumentVersion> findByDocument_IdAndVersion(UUID documentId, int version);
}
