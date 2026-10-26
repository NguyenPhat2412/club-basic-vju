package com.vju.club.modules.clubapplication.repository;

import com.vju.club.modules.clubapplication.entity.ClubApplicationFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClubApplicationFileRepository extends JpaRepository<ClubApplicationFile, UUID> {
    List<ClubApplicationFile> findByForm_IdOrderByCreatedAtAsc(UUID formId);

    List<ClubApplicationFile> findByForm_IdInOrderByCreatedAtAsc(Collection<UUID> formIds);

    List<ClubApplicationFile> findByApplication_IdOrderByCreatedAtAsc(UUID applicationId);

    List<ClubApplicationFile> findByApplication_IdInOrderByCreatedAtAsc(Collection<UUID> applicationIds);

    long countByApplication_Id(UUID applicationId);

    Optional<ClubApplicationFile> findByIdAndForm_Id(UUID id, UUID formId);

    Optional<ClubApplicationFile> findByIdAndApplication_Id(UUID id, UUID applicationId);
}
