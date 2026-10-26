package com.vju.club.modules.clubapplication.repository;

import com.vju.club.modules.clubapplication.entity.ClubApplicationForm;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClubApplicationFormRepository extends JpaRepository<ClubApplicationForm, UUID> {
    List<ClubApplicationForm> findByClub_IdOrderByIsDefaultDescCreatedAtDesc(UUID clubId);

    Optional<ClubApplicationForm> findByIdAndClub_Id(UUID id, UUID clubId);

    Optional<ClubApplicationForm> findFirstByClub_IdAndStatusOrderByIsDefaultDescCreatedAtDesc(UUID clubId, String status);

    Optional<ClubApplicationForm> findFirstByClub_IdOrderByIsDefaultDescCreatedAtDesc(UUID clubId);
}
