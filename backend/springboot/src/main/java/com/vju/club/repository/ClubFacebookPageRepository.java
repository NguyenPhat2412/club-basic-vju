package com.vju.club.repository;

import com.vju.club.entity.ClubFacebookPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClubFacebookPageRepository extends JpaRepository<ClubFacebookPage, UUID> {
    Optional<ClubFacebookPage> findByClub_Id(UUID clubId);
    void deleteByClub_Id(UUID clubId);

    @Query("SELECT p FROM ClubFacebookPage p JOIN FETCH p.club c "
            + "WHERE c.status = com.vju.club.enums.ClubStatus.ACTIVE "
            + "AND p.consecutiveSyncFailures < :maxFailures")
    List<ClubFacebookPage> findEligibleForAutoSync(@Param("maxFailures") int maxFailures);
}
