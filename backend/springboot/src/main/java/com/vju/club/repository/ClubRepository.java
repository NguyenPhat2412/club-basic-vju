package com.vju.club.repository;

import com.vju.club.entity.Club;
import com.vju.club.enums.ClubStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClubRepository extends JpaRepository<Club, UUID>, JpaSpecificationExecutor<Club> {
    @Query("SELECT count(c) > 0 FROM Club c WHERE lower(c.code) = lower(:code)")
    boolean existsByCodeIgnoreCase(@Param("code") String code);

    @Query("SELECT c FROM Club c WHERE lower(c.code) = lower(:code)")
    Optional<Club> findByCodeIgnoreCase(@Param("code") String code);

    Optional<Club> findByIdAndStatus(UUID id, ClubStatus status);

    @Query("SELECT DISTINCT trim(c.activityField) FROM Club c "
            + "WHERE c.status = com.vju.club.enums.ClubStatus.ACTIVE "
            + "AND c.activityField IS NOT NULL AND trim(c.activityField) <> '' "
            + "ORDER BY trim(c.activityField) ASC")
    List<String> findActiveCategories();
}
