package com.vju.club.modules.club.repository;

import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.entity.ClubStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ClubRepository extends JpaRepository<Club, UUID>, JpaSpecificationExecutor<Club> {

    @Query("SELECT count(c) > 0 FROM Club c WHERE lower(c.code) = lower(:code)")
    boolean existsByCodeIgnoreCase(@Param("code") String code);

    Optional<Club> findByIdAndStatus(UUID id, ClubStatus status);
}
